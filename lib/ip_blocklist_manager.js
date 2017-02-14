/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * This module is used to manage multiple ip blocklists. It has the
 * ability to initialize, load and reload itself on any list changes.
 *
 */
var Promise = require('bluebird')

module.exports = function (log, config) {
  var IPBlocklist = require('./ip_blocklist')(log, config)

  function IPBlocklistManager() {
    this.ipBlocklists = []
  }

  IPBlocklistManager.prototype.load = function (lists) {
    var self = this

    if (!Array.isArray(lists)) {
      throw Error('lists must be an array')
    }

    // Initialize and load a blocklist for each file path
    var loadedLists = lists.map(function (listPath) {
      var blocklist = new IPBlocklist()
      self.ipBlocklists.push(blocklist)
      return blocklist.load(listPath)
    })

    return Promise.all(loadedLists)
  }

  IPBlocklistManager.prototype.clear = function () {
    this.ipBlocklists = []
  }

  IPBlocklistManager.prototype.contains = function (ipAddress) {
    var self = this
    var startTime = Date.now()
    var endTime
    var found = false

    // Go through all blocklists and check if there is a match on the
    // ipAddress. We explicitly don't exit the loop on a hit because
    // we want to see all lists that hit for given ip address.
    var listhitPaths = []
    self.ipBlocklists.forEach(function (blocklist) {
      var containsIpAddress = blocklist.contains(ipAddress)
      if (containsIpAddress) {
        if (!found) {
          found = true
        }

        listhitPaths.push(blocklist.listPath)
      }
    })

    if (found) {
      endTime = Date.now()
      log.info({
        op: 'fxa.customs.blocklist.contains',
        ip: ipAddress,
        listhits: listhitPaths.join(','),
        listhitCount: listhitPaths.length,
        foundIn: (endTime - startTime)
      })
    }

    // Check to see if hit was on a log only list, if so consider that
    // ip not found.
    var logOnly = listhitPaths.some(function (listPath) {
      return config.ipBlocklist.logOnlyLists.indexOf(listPath) > -1
    })

    return found && !logOnly
  }

  IPBlocklistManager.prototype.pollForUpdates = function () {
    var self = this

    self.stopPolling()

    self.ipBlocklists.forEach(function (blocklist) {
      blocklist.pollForUpdates()
    })
  }

  IPBlocklistManager.prototype.stopPolling = function () {
    var self = this

    self.ipBlocklists.forEach(function (blocklist) {
      blocklist.stopPolling()
    })
  }

  return IPBlocklistManager
}
