#!/usr/bin/env node

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var memcached = require('./mc')


module.exports = function createAdminRunner(config, log) {

  var BLOCK_INTERVAL_MS = config.limits.blockIntervalSeconds * 1000
  var RATE_LIMIT_INTERVAL_MS = config.limits.rateLimitIntervalSeconds * 1000
  var MAX_ACCOUNT_STATUS_CHECK = config.limits.maxAccountStatusCheck

  var IpRecord = require('./ip_record')(BLOCK_INTERVAL_MS, RATE_LIMIT_INTERVAL_MS, MAX_ACCOUNT_STATUS_CHECK)

  var mc = memcached(config)

  function block(ip) {
    ip = ip && ip.trim()
    if (!ip) {
      throw new Error('no ip specified')
    }
    log.info('blocking ip: ' + ip)
    return mc.getAsync(ip)
      .then(IpRecord.parse)
      .then(function(ipRecord) {
        ipRecord.block()
        return mc.setAsync(ip, ipRecord, BLOCK_INTERVAL_MS / 1000)
      })
  }

  var COMMANDS = {
    'block': block
  }

  return function admin() {
    var cmd = arguments[0]
    if (!cmd) {
      throw new Error('no command')
    } else if (!(cmd in COMMANDS)) {
      throw new Error('unknown command: ' + cmd)
    } else {
      return COMMANDS[cmd].apply(this, Array.prototype.slice.call(arguments, 1))
    }
  }

}
