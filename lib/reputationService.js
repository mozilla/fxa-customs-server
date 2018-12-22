/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


var isBlockBelow = function (config, reputation) {
  return reputation > 0 && reputation < config.reputationService.blockBelow
}

var isSuspectBelow = function (config, reputation) {
  return reputation > 0 && reputation < config.reputationService.suspectBelow
}

var alwaysFalse = function () {
  return false
}

var report = function (log, ipClient, ip, action) {
  return ipClient.sendViolation(ip, action)
    .then(function(result) {
      var statusCode = result && result.statusCode
      log.info({ op: action + '.sendViolation', ip: ip, statusCode: statusCode })
    })
    .catch(function (err) {
      log.error({ op: action + '.sendViolation', ip: ip, err: err })
    })
}

var get = function (log, ipClient, ip) {
  return ipClient.get(ip)
    .then(function (response) {
      if (response && response.body && response.statusCode === 200) {
        log.info({ op: 'fetchIPReputation', ip: ip, reputation: response.body.reputation })
        return response.body.reputation
      }

      if (response.statusCode === 404) {
        log.info({ op: 'fetchIPReputation', ip: ip, err: 'Reputation not found for IP.'})
      } else {
        var err = { status: response.statusCode, body: response.body }
        log.error({ op: 'fetchIPReputation', ip: ip, err: err })
      }

      return null
    }).catch(function (err) {
      log.error({ op: 'fetchIPReputation', ip: ip, err: err})
      return null
    })
}

module.exports = function (config, log) {
  var mod = {
    isBlockBelow: alwaysFalse,
    isSuspectBelow: alwaysFalse,
    report: alwaysFalse,
    get: alwaysFalse
  }
  if (config.reputationService.enable) {
    var IPReputationClient = require('ip-reputation-js-client')
    var ipClient = new IPReputationClient({
      serviceUrl: config.reputationService.baseUrl,
      id: config.reputationService.hawkId,
      key: config.reputationService.hawkKey,
      timeout: config.reputationService.timeout
    })
    mod.report = report.bind(null, log, ipClient)

    if (config.reputationService.enableCheck) {
      mod.isBlockBelow = isBlockBelow.bind(null, config)
      mod.isSuspectBelow = isSuspectBelow.bind(null, config)
      mod.get = get.bind(null, log, ipClient)
    }
  }
  return mod
}
