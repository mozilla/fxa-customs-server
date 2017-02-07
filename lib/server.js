#!/usr/bin/env node

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var restify = require('restify')
var packageJson = require('../package.json')
var P = require('bluebird')
P.promisifyAll(Memcached.prototype)

// Create and return a restify server instance
// from the given config.

module.exports = function createServer(config, log) {

  var Record = require('./record')
  var RuleSet = require('./ruleset')

  var storage = require('./storage')(config, log)

  // XXX TODO: poll for updates
  var ruleset = new RuleSet(config, storage)

  function normalizedEmail(rawEmail) {
    return rawEmail.toLowerCase()
  }

  var api = restify.createServer()
  api.use(restify.bodyParser())

  api.post(
    '/check',
    function (req, res, next) {

      var records;

      P.resolve().then(() => {
        // Sanity-check and normalize input parameters.
        if (! req.body.ip || ! req.body.action) {
          throw new Error({
            code: 'MissingParameters',
            message: 'ip and action are required'
          })
        }
        if (req.body.email) {
          req.body.email = normalizedEmail(req.body.email)
        }
      }).then(() => {
        // Load all the records me migth need up-front.
        return storage.fetchRecords(req.body).then(res => {
          records = res
        })
      }).then(() => {
        // If the IP, email or UID has been outright banned, just block it.
        // It's malicious, it shouldn't penalize other records or allow
        // (most) escape hatches.  Just abort!
        var retryAfter = Math.max(
          records.ip.isBanned() || 0,
          records.email && records.email.isBanned() || 0,
          records.uid && records.uid.isBanned() || 0
        )
        if (retryAfter) {
          return new Judgement({
            triggeredRules: ["ban"],
            block: true,
            retryAfter: retryAfter
          })
        }
        // Check all the applicable rules from our config,
        // applying any sanctions to our final judgement.
        var judgement = new Judgement()
        ruleset.findApplicableRules(req.body).each(rule => {
          var record = records[rule.groupBy]
          if (! record && rule.groupBy) {
            throw new Error({
              code: 'MissingParameters',
              message: 'Rule ' + rule.name + ' requires param ' + rule.groupBy
              res.send(400, err)
            })
          }
          return rule.check(req.body, record).then(function(sanctions) {
            if (sanctions) {
              log.info({
                op: 'request.check.ruleTriggered',
                rule: rule.name,
              })
              judgement.include(rule, sanctions, record)
            }
          })
        }).then(() => {
          return judgement
        })
      }).finally(() => {
        // Always write back any changes to the records,
        // even if something errored out.
        return storage.updateRecords(req.body, records)
      }).then(judgement => {
        // Regardless of all the above checks, there are some
        // IPs and emails that we just won't block.  These are
        // typically for Mozilla QA purposes.  We check them at
        // the end so as not to pay the overhead of the checks
        // on the many requests that are *not* QA-related.
        if (judgement.block || judgement.suspect) {
          if (req.body.ip in allowedIPs.ips || allowedEmailDomains.isAllowed(req.body.email)) {
            log.info({
              op: 'request.check.allowed',
              ip: ip,
              block: result.block,
              suspect: result.suspect
            })
            judgement.block = false
            judgement.suspect = false
          }
        }

        log.info({
          op: 'request.check',
          email: req.body.email,
          ip: req.body.ip,
          uid: req.body.uid,
          action: req.body.action,
          block: judgement.block,
          unblock: judgement.canUnblock,
          suspect: judgement.suspect
        })
        res.send({
          block: judgement.block,
          retryAfter: judgement.retryAfter,
          unblock: judgement.canUnblock,
          suspect: judgement.suspect
        })
        // XXX TODO: report back to ip-reputation service if we block something
      }, (err) => {
        // Fail closed if there's any unexpected error.
        log.error({
          op: 'request.check',
          email: req.body.email,
          ip: req.body.ip,
          uid: req.body.uid,
          action: req.body.action,
          err: err
        })
        res.send({
          block: true,
          unblock: false
        })
      }).done(next, next)
    }
  )

  api.post(
    '/report',
    function (req, res, next) {

      var records;

      P.resolve().then(() => {
        // Sanity-check and normalize input parameters.
        if (! req.body.ip || ! req.body.action) {
          throw new Error({
            code: 'MissingParameters',
            message: 'ip and action are required'
          })
        }
        if (req.body.email) {
          req.body.email = normalizedEmail(req.body.email)
        }
      }).then(() => {
        // Load all the records me migth need up-front.
        return storage.fetchRecords(req.body).then(res => {
          records = res
        }
      }).then(() => {
        // Report the error to all applicable rules.
        ruleset.findApplicableRules(req.body).each(rule => {
          var record = records[rule.groupBy]
          if (! record && rule.groupBy) {
            throw new Error({
              code: 'MissingParameters',
              message: 'Rule ' + rule.name + ' requires param ' + rule.groupBy
              res.send(400, err)
            })
          }
          return rule.report(req.body, record)
        })
      }).finally(() => {
        // Always write changes back, even if something errored out.
        return storage.updateRecords(req.body, records)
      }).done(next, next)
    }
  )

  api.post(
    '/banEmail',
    function (req, res, next) {
      throw new Error('not implemented yet')
    }
  )

  api.post(
    '/banIp',
    function (req, res, next) {
      throw new Error('not implemented yet')
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
    '/rules',
    function (req, res, next) {
      throw new Error('not implemented yet')
    }
  )

  api.post(
    '/rules',
    function (req, res, next) {
      throw new Error('not implemented yet')
    }
  )

  api.get(
    '/allowedIPs',
    function (req, res, next) {
      throw new Error('not implemented yet')
    }
  )

  api.post(
    '/allowedIPs',
    function (req, res, next) {
      throw new Error('not implemented yet')
    }
  )

  api.get(
    '/allowedEmailDomains',
    function (req, res, next) {
      throw new Error('not implemented yet')
    }
  )

  api.post(
    '/allowedEmailDomains',
    function (req, res, next) {
      throw new Error('not implemented yet')
    }
  )

  return P.resolve(api)
}
