#!/usr/bin/env node

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var Memcached = require('memcached')
var restify = require('restify')
var packageJson = require('../package.json')
var P = require('bluebird')
P.promisifyAll(Memcached.prototype)

// Create and return a restify server instance
// from the given config.

module.exports = function createServer(config, log) {

  var startupDefers = []

  // Setup blocklist manager
  if (config.ipBlocklist.enable) {
    var IPBlocklistManager = require('./ip_blocklist_manager')(log, config)
    var blockListManager = new IPBlocklistManager()
    startupDefers.push(blockListManager.load(config.ipBlocklist.lists))
    blockListManager.pollForUpdates()
  }

  var mc = new Memcached(
    config.memcache.address,
    {
      timeout: 500,
      retries: 1,
      retry: 1000,
      reconnect: 1000,
      idle: 30000,
      namespace: 'fxa~'
    }
  )

  var limits = require('./limits')(config, mc, log)
  var allowedIPs = require('./allowed_ips')(config, mc, log)
  var allowedEmailDomains = require('./allowed_email_domains')(config, mc, log)

  if (config.updatePollIntervalSeconds) {
    limits.refresh({ pushOnMissing: true })
    limits.pollForUpdates()
    allowedIPs.refresh({ pushOnMissing: true })
    allowedIPs.pollForUpdates()
    allowedEmailDomains.refresh({ pushOnMissing: true })
    allowedEmailDomains.pollForUpdates()
  }

  var IpEmailRecord = require('./ip_email_record')(limits)
  var EmailRecord = require('./email_record')(limits)
  var IpRecord = require('./ip_record')(limits)
  var UidRecord = require('./uid_record')(limits)

  var handleBan = P.promisify(require('./bans/handler')(config.memcache.recordLifetimeSeconds, mc, EmailRecord, IpRecord, log))

  // optional SQS-based IP/email banning API
  if (config.bans.region && config.bans.queueUrl) {
    var bans = require('./bans')(log)
    bans(config.bans, mc)
    log.info({ op: 'listeningSQS', sqsRegion: config.bans.region, sqsQueueUrl: config.bans.queueUrl })
  }

  var api = restify.createServer()
  api.use(restify.bodyParser())

  function logError(err) {
    log.error({ op: 'memcachedError', err: err })
    throw err
  }

  function fetchRecords(email, ip) {
    return P.all(
      [
        // get records and ignore errors by returning a new record
        mc.getAsync(email).then(EmailRecord.parse, EmailRecord.parse),
        mc.getAsync(ip).then(IpRecord.parse, IpRecord.parse),
        mc.getAsync(ip + email).then(IpEmailRecord.parse, IpEmailRecord.parse)
      ]
    )
  }

  function setRecord(key, record) {
    var lifetime = Math.max(config.memcache.recordLifetimeSeconds, record.getMinLifetimeMS() / 1000)
    return mc.setAsync(key, record, lifetime)
  }

  function setRecords(email, ip, emailRecord, ipRecord, ipEmailRecord) {
    return P.all(
      [
        setRecord(email, emailRecord),
        setRecord(ip, ipRecord),
        setRecord(ip + email, ipEmailRecord)
      ]
    )
  }

  function max(prev, cur) {
    return Math.max(prev, cur)
  }

  function normalizedEmail(rawEmail) {
    return rawEmail.toLowerCase()
  }

  api.post(
    '/check',
    function (req, res, next) {
      var email = req.body.email
      var ip = req.body.ip
      var action = req.body.action

      if (!email || !ip || !action) {
        var err = {code: 'MissingParameters', message: 'email, ip and action are all required'}
        log.error({ op: 'request.check', email: email, ip: ip, action: action, err: err })
        res.send(400, err)
        return next()
      }
      email = normalizedEmail(email)

      fetchRecords(email, ip)
        .spread(
          function (emailRecord, ipRecord, ipEmailRecord) {
            if (ipRecord.isBlocked()) {
              // a blocked ip should just be ignored completely
              // it's malicious, it shouldn't penalize emails or allow
              // any escape hatches. just abort!
              return {
                block: true,
                retryAfter: ipRecord.retryAfter()
              }
            }


            var blockEmail = emailRecord.update(action)
            var blockIpEmail = ipEmailRecord.update(action)
            var blockIp = ipRecord.update(action, email)

            if (blockIpEmail && ipEmailRecord.unblockIfReset(emailRecord.pr)) {
              blockIpEmail = 0
            }

            var retryAfter = [blockEmail, blockIpEmail, blockIp].reduce(max)

            var allowedIP = ip in allowedIPs.ips
            var allowedEmailDomain = allowedEmailDomains.isAllowed(email)

            if (retryAfter > 0) {
              if (allowedIP) {
                retryAfter = 0
              }
              if (allowedEmailDomain) {
                retryAfter = 0
              }
            }

            // IP's that are in blocklist should be blocked
            // and not return a retryAfter because it is not known
            // when they would be removed from blocklist
            if (config.ipBlocklist.enable && blockListManager.contains(ip) && !allowedIP && !allowedEmailDomain) {
              if (!config.ipBlocklist.logOnly) {

                // When blocklist is enabled, explicitly skip setting records.
                // Requests issued while on blocklist will not count towards
                // the rate limit.
                return {
                  block: true
                }
              }
            }

            return setRecords(email, ip, emailRecord, ipRecord, ipEmailRecord)
              .then(
                function () {
                  return {
                    block: retryAfter > 0,
                    retryAfter: retryAfter
                  }
                }
              )
          }
        )
        .then(
          function (result) {
            log.info({ op: 'request.check', email: email, ip: ip, action: action, block: result.block })
            res.send(result)
          },
          function (err) {
            log.error({ op: 'request.check', email: email, ip: ip, action: action, err: err })

            // Default is to block request on any server based error
            res.send({
              block: true,
              retryAfter: limits.rateLimitIntervalSeconds
            })
          }
        )
        .done(next, next)
    }
  )

  api.post(
    '/checkAuthenticated',
    function (req, res, next) {
      var action = req.body.action
      var ip = req.body.ip
      var uid = req.body.uid

      if(!action || !ip || !uid){
        var err = {code: 'MissingParameters', message: 'action, ip and uid are all required'}
        log.error({op:'request.checkAuthenticated', action: action, ip: ip, uid: uid, err: err})
        res.send(400, err)
        return next()
      }

      mc.getAsync(uid)
        .then(UidRecord.parse, UidRecord.parse)
        .then(
          function (uidRecord) {
            var retryAfter = uidRecord.addCount(action, uid)

            return setRecord(uid, uidRecord)
              .then(
                function () {
                  return {
                    block: retryAfter > 0,
                    retryAfter: retryAfter
                  }
                }
              )
          }
        )
        .then(
          function (result) {
            log.info({ op: 'request.checkAuthenticated', block: result.block })
            res.send(result)
          },
          function (err) {
            log.error({ op: 'request.checkAuthenticated', err: err })
            // Default is to block request on any server based error
            res.send({
              block: true,
              retryAfter: limits.blockIntervalMs
            })
          }
        )
        .done(next, next)
    }
  )

  api.post(
    '/failedLoginAttempt',
    function (req, res, next) {
      var email = req.body.email
      var ip = req.body.ip
      var errno = Number(req.body.errno) || 999
      if (!email || !ip) {
        var err = {code: 'MissingParameters', message: 'email and ip are both required'}
        log.error({ op: 'request.failedLoginAttempt', email: email, ip: ip, err: err })
        res.send(400, err)
        return next()
      }
      email = normalizedEmail(email)

      fetchRecords(email, ip)
        .spread(
          function (emailRecord, ipRecord, ipEmailRecord) {
            ipRecord.addBadLogin({ email: email, errno: errno })
            ipEmailRecord.addBadLogin()
            return setRecords(email, ip, emailRecord, ipRecord, ipEmailRecord)
              .then(
                function () {
                  return {}
                }
              )
          }
        )
        .then(
          function (result) {
            log.info({ op: 'request.failedLoginAttempt', email: email, ip: ip, errno: errno })
            res.send(result)
          },
          function (err) {
            log.error({ op: 'request.failedLoginAttempt', email: email, ip: ip, err: err })
            res.send(500, err)
          }
        )
        .done(next, next)
    }
  )

  api.post(
    '/passwordReset',
    function (req, res, next) {
      var email = req.body.email
      if (!email) {
        var err = {code: 'MissingParameters', message: 'email is required'}
        log.error({ op: 'request.passwordReset', email: email, err: err })
        res.send(400, err)
        return next()
      }
      email = normalizedEmail(email)

      mc.getAsync(email)
        .then(EmailRecord.parse, EmailRecord.parse)
        .then(
          function (emailRecord) {
            emailRecord.passwordReset()
            return setRecord(email, emailRecord).catch(logError)
          }
        )
        .then(
          function () {
            log.info({ op: 'request.passwordReset', email: email })
            res.send({})
          },
          function (err) {
            log.error({ op: 'request.passwordReset', email: email, err: err })
            res.send(500, err)
          }
        )
        .done(next, next)
    }
  )

  api.post(
    '/blockEmail',
    function (req, res, next) {
      var email = req.body.email
      if (!email) {
        var err = {code: 'MissingParameters', message: 'email is required'}
        log.error({ op: 'request.blockEmail', email: email, err: err })
        res.send(400, err)
        return next()
      }
      email = normalizedEmail(email)

      handleBan({ ban: { email: email } })
        .then(
          function () {
            log.info({ op: 'request.blockEmail', email: email })
            res.send({})
          }
        )
        .catch(
          function (err) {
            log.error({ op: 'request.blockEmail', email: email, err: err })
            res.send(500, err)
          }
        )
        .done(next, next)
    }
  )

  api.post(
    '/blockIp',
    function (req, res, next) {
      var ip = req.body.ip
      if (!ip) {
        var err = {code: 'MissingParameters', message: 'ip is required'}
        log.error({ op: 'request.blockIp', ip: ip, err: err })
        res.send(400, err)
        return next()
      }

      handleBan({ ban: { ip: ip } })
        .then(
          function () {
            log.info({ op: 'request.blockIp', ip: ip })
            res.send({})
          }
        )
        .catch(
          function (err) {
            log.error({ op: 'request.blockIp', ip: ip, err: err })
            res.send(500, err)
          }
        )
        .done(next, next)
    }
  )

  api.get(
    '/',
    function (req, res, next) {
      res.send({ version: packageJson.version })
      next()
    }
  )

  api.get(
    '/limits',
    function (req, res, next) {
      res.send(limits)
      next()
    }
  )

  api.get(
    '/allowedIPs',
    function (req, res, next) {
      res.send(Object.keys(allowedIPs.ips))
      next()
    }
  )

  api.get(
    '/allowedEmailDomains',
    function (req, res, next) {
      res.send(Object.keys(allowedEmailDomains.domains))
      next()
    }
  )

  return P.all(startupDefers)
    .then(function () {
      return api
    })
}
