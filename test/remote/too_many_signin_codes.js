/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const test = require('tap').test
const TestServer = require('../test_server')
const Promise = require('bluebird')
const restify = Promise.promisifyAll(require('restify'))
const memcached = require('../memcache-helper')

const TEST_IP = '192.0.2.1'
const VERIFY_CODE = 'signinCode'

const config = {
  listen: {
    port: 7000
  }
}

process.env.MAX_VERIFY_CODES = 2
process.env.RATE_LIMIT_INTERVAL_SECONDS = 1
process.env.IP_RATE_LIMIT_INTERVAL_SECONDS = 1
process.env.IP_RATE_LIMIT_BAN_DURATION_SECONDS = 1

const testServer = new TestServer(config)

const client = restify.createJsonClient({
  url: 'http://127.0.0.1:' + config.listen.port
})

Promise.promisifyAll(client, { multiArgs: true })

test('startup', t => {
  testServer.start(err => {
    t.type(testServer.server, 'object', 'test server was started')
    t.notOk(err, 'no errors were returned')
    t.end()
  })
})

test('clear everything', t => {
  memcached.clearEverything(err => {
    t.notOk(err, 'no errors were returned')
    t.end()
  })
})

test('/check `signinCode` by email', t => {
  return client.postAsync('/check', {
    ip: TEST_IP,
    email: 'foo@example.com',
    action: VERIFY_CODE
  })
    .spread((req, res, obj) => {
      t.equal(res.statusCode, 200, '/check should return a 200 response')
      t.equal(obj.block, false, '/check should return block:false')

      return client.postAsync('/check', {
        ip: TEST_IP,
        email: 'foo@example.com',
        action: VERIFY_CODE
      })
    })
    .spread((req, res, obj) => {
      t.equal(res.statusCode, 200, '/check should return a 200 response')
      t.equal(obj.block, false, '/check should return block:false')

      return client.postAsync('/check', {
        ip: TEST_IP,
        email: 'foo@example.com',
        action: VERIFY_CODE
      })
    })
    .spread((req, res, obj) => {
      t.equal(res.statusCode, 200, '/check should return a 200 response')
      t.equal(obj.block, true, '/check should return block:true')
      t.equal(obj.retryAfter, 1, '/check should return retryAfter:1')

      return Promise.delay(1001)
    })
    .then(() => {
      return client.postAsync('/check', {
        ip: TEST_IP,
        email: 'foo@example.com',
        action: VERIFY_CODE
      })
    })
    .spread((req, res, obj) => {
      t.equal(res.statusCode, 200, '/check should return a 200 response')
      t.equal(obj.block, false, '/check should return block:false')
      t.end()
    })
    .catch(err => {
      t.fail(err)
      t.end()
    })
})

test('clear everything', t => {
  memcached.clearEverything(err => {
    t.notOk(err, 'no errors were returned')
    t.end()
  })
})

test('/check `signinCode` by ip', t => {
  return client.postAsync('/check', {
    ip: TEST_IP,
    email: 'bar@example.com',
    action: VERIFY_CODE
  })
    .spread((req, res, obj) => {
      t.equal(res.statusCode, 200, '/check should return a 200 response')
      t.equal(obj.block, false, '/check should return block:false')

      return client.postAsync('/check', {
        ip: TEST_IP,
        email: 'baz@example.com',
        action: VERIFY_CODE
      })
    })
    .spread((req, res, obj) => {
      t.equal(res.statusCode, 200, '/check should return a 200 response')
      t.equal(obj.block, false, '/check should return block:false')

      return client.postAsync('/check', {
        ip: TEST_IP,
        email: 'bar@example.com',
        action: VERIFY_CODE
      })
    })
    .spread((req, res, obj) => {
      t.equal(res.statusCode, 200, '/check should return a 200 response')
      t.equal(obj.block, false, '/check should return block:false')

      return client.postAsync('/check', {
        ip: TEST_IP,
        email: 'qux@example.com',
        action: VERIFY_CODE
      })
    })
    .spread((req, res, obj) => {
      t.equal(res.statusCode, 200, '/check should return a 200 response')
      t.equal(obj.block, true, '/check should return block:true')
      t.equal(obj.retryAfter, 1, '/check should return retryAfter:1')

      return Promise.delay(1001)
    })
    .then(() => {
      return client.postAsync('/check', {
        ip: TEST_IP,
        email: 'qux@example.com',
        action: VERIFY_CODE
      })
    })
    .spread((req, res, obj) => {
      t.equal(res.statusCode, 200, '/check should return a 200 response')
      t.equal(obj.block, false, '/check should return block:false')
      t.end()
    })
    .catch(err => {
      t.fail(err)
      t.end()
    })
})

test('teardown', t => {
  testServer.stop()
  t.equal(testServer.server.killed, true, 'test server has been killed')
  t.end()
})

