/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

var test = require('tap').test
var TestServer = require('../test_server')
var ReputationServerStub = require('../test_reputation_server')
var Promise = require('bluebird')
var restify = require('restify')
var mcHelper = require('../memcache-helper')

var TEST_EMAIL = 'test@example.com'
var TEST_EMAIL_2 = 'test+2@example.com'
var TEST_IP = '192.0.2.1'
var ALLOWED_IP = '192.0.3.1'
var TEST_UID = 'abc123'
var TEST_ACTION = 'action1'
var TEST_CHECK_ACTION = 'recoveryEmailVerifyCode'

// wait for the violation to be sent for endpoints that respond
// before sending violation
var TEST_DELAY_MS = 400

var config = {
  listen: {
    port: 7000
  },
  limits: {
    rateLimitIntervalSeconds: 1
  },
  reputationService: {
    enable: true,
    host: '127.0.0.1',
    port: 9009,
    timeout: 25
  }
}

// Override limit values for testing
process.env.ALLOWED_IPS = ALLOWED_IP
process.env.MAX_VERIFY_CODES = 2
process.env.MAX_BAD_LOGINS_PER_IP = 1
process.env.UID_RATE_LIMIT = 3
process.env.UID_RATE_LIMIT_INTERVAL_SECONDS = 2
process.env.UID_RATE_LIMIT_BAN_DURATION_SECONDS = 2
process.env.RATE_LIMIT_INTERVAL_SECONDS = config.limits.rateLimitIntervalSeconds

// Enable reputation test server
process.env.REPUTATION_SERVICE_ENABLE = config.reputationService.enable
process.env.REPUTATION_SERVICE_IP_ADDRESS = config.reputationService.host
process.env.REPUTATION_SERVICE_PORT = config.reputationService.port
process.env.REPUTATION_SERVICE_TIMEOUT = config.reputationService.timeout

var testServer = new TestServer(config)
var reputationServer = new ReputationServerStub(config)

var client = restify.createJsonClient({
  url: 'http://127.0.0.1:' + config.listen.port
})
var reputationClient = restify.createJsonClient({
  url: 'http://' + config.reputationService.host + ':' + config.reputationService.port
})

Promise.promisifyAll(client, { multiArgs: true })
Promise.promisifyAll(reputationClient, { multiArgs: true })

test(
  'startup',
  function (t) {
    testServer.start(function (err) {
      t.type(testServer.server, 'object', 'test server was started')
      t.notOk(err, 'no errors were returned')
      t.end()
    })
  }
)

test(
  'startup reputation service',
  function (t) {
    reputationServer.start(function (err) {
      t.type(reputationServer.server, 'object', 'test server was started')
      t.notOk(err, 'no errors were returned')
      t.end()
    })
  }
)

test(
  'clear everything',
  function (t) {
    mcHelper.clearEverything(
      function (err) {
        t.notOk(err, 'no errors were returned')
        t.end()
      }
    )
  }
)

test(
  'sends violation /check resulting in lockout',
  function (t) {
    return client.postAsync('/check', { email: TEST_EMAIL, ip: TEST_IP, action: TEST_CHECK_ACTION })
      .spread(function (req, res, obj) {
        t.equal(res.statusCode, 200, 'first action noted')
        t.equal(obj.block, false, 'first action not blocked')
        return client.postAsync('/check', { email: TEST_EMAIL, ip: TEST_IP, action: TEST_CHECK_ACTION })
      }).spread(function (req, res, obj) {
        t.equal(res.statusCode, 200, 'second action noted')
        t.equal(obj.block, false, 'second action not blocked')
        return client.postAsync('/check', { email: TEST_EMAIL, ip: TEST_IP, action: TEST_CHECK_ACTION })
      }).spread(function (req, res, obj) {
        t.equal(res.statusCode, 200, 'third action attempt noted')
        t.equal(obj.block, true, 'third action blocked')
        return Promise.delay(TEST_DELAY_MS)
      }).then(function () {
        return reputationClient.getAsync('/mostRecentViolation/' + TEST_IP)
      }).spread(function (req, res, obj) {
        t.equal(res.body, '"fxa:request.check.block.recoveryEmailVerifyCode"', 'sends violation when /check')
        return reputationClient.delAsync('/mostRecentViolation/' + TEST_IP)
      }).spread(function (req, res, obj) {
        t.equal(res.statusCode, 200, 'Failed to clear sent violation from test server.')
        t.end()
      }).catch(function(err) {
        t.fail(err)
        t.end()
      })
  }
)

test(
  'sends violation when /checkAuthenticated rate limited',
  function (t) {
    return client.postAsync('/checkAuthenticated', { action: TEST_ACTION, ip: TEST_IP, uid: TEST_UID })
      .spread(function (req, res, obj) {
        t.equal(res.statusCode, 200, 'returns 200 for /checkAuthenticated 1')
        t.equal(obj.block, false, 'not rate limited')
        return client.postAsync('/checkAuthenticated', { action: TEST_ACTION, ip: TEST_IP, uid: TEST_UID })
      }).spread(function (req, res, obj) {
        t.equal(res.statusCode, 200, 'returns 200 for /checkAuthenticated 2')
        t.equal(obj.block, false, 'not rate limited')
        return client.postAsync('/checkAuthenticated', { action: TEST_ACTION, ip: TEST_IP, uid: TEST_UID })
      }).spread(function (req, res, obj) {
        t.equal(res.statusCode, 200, 'returns 200 for /checkAuthenticated 3')
        t.equal(obj.block, true, 'rate limited')
        return Promise.delay(TEST_DELAY_MS)
      }).then(function () {
        return reputationClient.getAsync('/mostRecentViolation/' + TEST_IP)
      }).spread(function (req, res, obj) {
        t.equal(res.body, '"fxa:request.checkAuthenticated.block.action1"', 'Violation sent.')
        return reputationClient.delAsync('/mostRecentViolation/' + TEST_IP)
      }).spread(function (req, res, obj) {
        t.equal(res.statusCode, 200, 'Failed to clear sent violation from test server.')
        t.end()
      }).catch(function(err) {
        t.fail(err)
        t.end()
      })
  }
)

test(
  'sends violation /failedLoginAttempt results in lockout',
  function (t) {
    return client.postAsync('/failedLoginAttempt', { email: TEST_EMAIL, ip: TEST_IP })
      .spread(function (req, res, obj) {
        t.equal(res.statusCode, 200, 'first login attempt noted')
        return client.postAsync('/failedLoginAttempt', { email: TEST_EMAIL_2, ip: TEST_IP })
      }).spread(function (req, res, obj) {
        t.equal(res.statusCode, 200, 'second login attempt noted')
        return reputationClient.getAsync('/mostRecentViolation/' + TEST_IP)
      }).spread(function (req, res, obj) {
        t.equal(res.body, '"fxa:request.failedLoginAttempt.isOverBadLogins"', 'sends violation.')
        return reputationClient.delAsync('/mostRecentViolation/' + TEST_IP)
      }).spread(function (req, res, obj) {
        t.equal(res.statusCode, 200, 'Failed to clear sent violation from test server.')
        t.end()
      }).catch(function(err) {
        t.fail(err)
        t.end()
      })
  }
)

test(
  'sends violation for blocked IP from /blockIp request',
  function (t) {
    return client.postAsync('/blockIp', { ip: TEST_IP })
      .spread(function (req, res, obj) {
        t.equal(res.statusCode, 200, 'blockIp returns 200')
        return Promise.delay(TEST_DELAY_MS)
      }).then(function () {
        return reputationClient.getAsync('/mostRecentViolation/' + TEST_IP)
      }).spread(function (req, res, obj) {
        t.equal(res.body, '"fxa:request.blockIp"', 'sends violation when IP blocked')
        return reputationClient.delAsync('/mostRecentViolation/' + TEST_IP)
      }).spread(function (req, res, obj) {
        t.equal(res.statusCode, 200, 'Failed to clear sent violation from test server.')
        t.end()
      })
  }
)

test(
  'teardown',
  function (t) {
    testServer.stop()
    t.equal(testServer.server.killed, true, 'test server killed')
    reputationServer.stop()
    t.end()
  }
)