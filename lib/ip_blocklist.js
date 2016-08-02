/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * This module is capable of loading an ip blocklist file and checking if an ip address is contained in it.
 * The ip blocklist file must contain at least one column that has ip addresses or an ip address range
 * in the following formats, 192.168.0.0 or 192.168.0.0/32.
 *
 */
var Promise = require('bluebird')
var readFile = Promise.promisify(require('fs').readFile)
var parse = Promise.promisify(require('csv-parse'))
var path = require('path')
var ip = require('ip')

module.exports = function (log) {

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
  }

  IPBlocklist.prototype.load = function (csvPath) {
    var self = this
    csvPath = path.join(__dirname, csvPath)

    return readFile(csvPath, 'utf8')
      .then(function (data) {
        return parse(data)
      })
      .then(function (rows) {
        rows.forEach(function (row) {
          var parsedData = parseRow(row[0])

          if (parsedData) {
            if (! self.ipsByPrefixLength[parsedData.prefixLength]) {
              self.prefixLengths.push(parsedData.prefixLength)
              self.ipsByPrefixLength[parsedData.prefixLength] = {}
            }
            self.ipsByPrefixLength[parsedData.prefixLength][parsedData.baseIp] = true
          }
        })
      })
  }

  IPBlocklist.prototype.clear = function () {
    this.prefixLengths = []
    this.ipsByPrefixLength = {}
  }

  IPBlocklist.prototype.contains = function (ipAddress) {
    var self = this

    try {
      return self.prefixLengths.some(function (prefixLength) {
        return getBaseIp(ipAddress, prefixLength) in self.ipsByPrefixLength[prefixLength]
      })
    } catch(err){
      // On any error, fail closed and reject request. These errors could be
      // malformed ip address, etc
      log.error(err)
      return true
    }
  }

  return IPBlocklist
}

