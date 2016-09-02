/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * This module contains all the functionality needed to initialize, load
 * and check an ip blocklist. The ip blocklist file must contain
 * at least one column that has ip addresses or an ip address range
 * in the following formats, 192.168.0.0 or 192.168.0.0/32. The blocklist
 * polls for any file changes and reloads itself if needed.
 *
 */
var Promise = require('bluebird')
var readFile = Promise.promisify(require('fs').readFile)
var statFile = Promise.promisify(require('fs').stat)
var parse = Promise.promisify(require('csv-parse'))
var path = require('path')
var ip = require('ip')

module.exports = function (log, config) {

  function getBaseIp(addr, prefixLength) {
    return ip.mask(addr, ip.fromPrefixLen(prefixLength))
  }

  function parseRow(ipColumn) {
    // Ignore # lines
    if (ipColumn.length > 0 && ipColumn[0] === '#') {
      return
    }

    // Parse row for ip address components, supports 1.10.16.0/20 or 1.10.16.0.
    // Converts them to a base IP address and a prefix length.
    var tokens = ipColumn.split('/')
    if (tokens.length === 2) {
      var prefixLength = parseInt(tokens[1], 10)
      return {
        baseIp: getBaseIp(tokens[0], prefixLength),
        prefixLength: prefixLength
      }
    }

    return {
      baseIp: tokens[0],
      prefixLength: 32
    }
  }

  function IPBlocklist() {
    this.prefixLengths = []
    this.ipsByPrefixLength = {}
    this.fileLastModified = 0
    this.pollInterval = null
  }

  IPBlocklist.prototype.load = function (filePath) {
    var self = this

    // Resolve file path to an absolute location
    filePath = path.resolve(filePath)
    self.filePath = filePath
    self.fileName = path.basename(filePath)

    var startTime = Date.now()
    return statFile(filePath)
      .then(function (fileStats) {
        self.fileLastModified = fileStats.mtime
        self.fileSize = fileStats.size
        return readFile(filePath, 'utf8')
      })
      .then(function (data) {
        return parse(data)
      })
      .then(function (rows) {
        rows.forEach(function (row) {
          var parsedData = parseRow(row[0])

          if (parsedData) {
            if (!self.ipsByPrefixLength[parsedData.prefixLength]) {
              self.prefixLengths.push(parsedData.prefixLength)
              self.ipsByPrefixLength[parsedData.prefixLength] = {}
            }
            self.ipsByPrefixLength[parsedData.prefixLength][parsedData.baseIp] = true
          }
        })

        var endTime = Date.now()
        log.info({
          op: 'IPBlocklist.load',
          fileName: self.fileName,
          fileSize: self.fileSize,
          loadedIn: (endTime - startTime)
        })
      })
  }

  IPBlocklist.prototype.clear = function () {
    this.prefixLengths = []
    this.ipsByPrefixLength = {}
  }

  IPBlocklist.prototype.contains = function (ipAddress) {
    var self = this

    var startTime = Date.now()
    var endTime

    try {
      return self.prefixLengths.some(function (prefixLength) {
        var result = getBaseIp(ipAddress, prefixLength) in self.ipsByPrefixLength[prefixLength]

        // If `hit` log metrics on time taken
        if (result) {
          endTime = Date.now()
          log.info({op: 'IPBlocklist.contains.hit', ip: ipAddress, fileName: self.fileName, foundIn: (endTime - startTime)})
        }

        return result
      })
    } catch (err) {
      // On any error, fail closed and reject request. These errors could be
      // malformed ip address, etc
      log.error({op: 'IPBlocklist.contains.error', fileName: self.fileName, fileSize: self.fileSize, err: err})
      return true
    }
  }

  IPBlocklist.prototype.pollForUpdates = function () {
    this.stopPolling()
    this.pollInterval = setInterval(this.refresh.bind(this), config.ipBlocklist.updatePollInterval * 1000)
  }

  IPBlocklist.prototype.stopPolling = function () {
    clearInterval(this.pollInterval)
  }

  IPBlocklist.prototype.refresh = function () {
    var self = this

    log.trace({op: 'IPBlocklist.refreshList', fileName: self.fileName, fileSize: self.fileSize})

    return statFile(self.filePath)
      .then(function (fileStats) {
        var mtime = fileStats.mtime
        if (mtime > self.fileLastModified) {
          self.fileLastModified = mtime
          return self.load(self.filePath)
        }
      })
      .catch(function (err) {
        log.error(err)
      })
  }

  return IPBlocklist
}
