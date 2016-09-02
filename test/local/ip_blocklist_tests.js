/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

require('ass')

var log = {
  info: function () {},
  error: function () {},
  trace: function () {}
}

var test = require('tap').test
var IPBlocklist = require('../../lib/ip_blocklist')(log)
var filePath = './test/mocks/simple.netset'

test(
  'calling contains without loading csv return false',
  function (t) {
    var ipBlocklist = new IPBlocklist()
    var result = ipBlocklist.contains('0.0.0.0')
    t.equal(result, false, 'should not have found ip')
    t.end()
  }
)

test(
  'load ip blocklist',
  function (t) {
    var ipBlocklist = new IPBlocklist()

    ipBlocklist.load(filePath)
      .then(function () {
        t.end()
      })
      .catch(function () {
        t.fail('Failed to load csv')
        t.end()
      })
  }
)

test(
  'returns true for empty ip',
  function (t) {
    var ipBlocklist = new IPBlocklist()

    ipBlocklist.load(filePath)
      .then(function () {
        var result = ipBlocklist.contains()
        t.equal(result, true, 'return true for empty ip')
        t.end()
      })
  }
)

test(
  'returns true for invalid ip',
  function (t) {
    var ipBlocklist = new IPBlocklist()

    ipBlocklist.load(filePath)
      .then(function () {
        var result = ipBlocklist.contains('notip')
        t.equal(result, true, 'return true for invalid ip')
        t.end()
      })
  }
)

test(
  'returns true for ip in blocklist',
  function (t) {
    var ipBlocklist = new IPBlocklist()

    ipBlocklist.load(filePath)
      .then(function () {
        var result = ipBlocklist.contains('1.93.0.224')
        t.equal(result, true, 'return true for found ip')
        t.end()
      })
  }
)

test(
  'returns true for ip in blocklist range',
  function (t) {
    var ipBlocklist = new IPBlocklist()

    ipBlocklist.load(filePath)
      .then(function () {
        var result = ipBlocklist.contains('0.0.0.1')
        t.equal(result, true, 'return true for found ip')
        t.end()
      })
  }
)

test(
  'returns false for ip not in blocklist',
  function (t) {
    var ipBlocklist = new IPBlocklist()

    ipBlocklist.load(filePath)
      .then(function () {
        var result = ipBlocklist.contains('12.34.32.1')
        t.equal(result, false, 'return false for not found ip')
        t.end()
      })
  }
)

test(
  'returns false for ip not in blocklist range',
  function (t) {
    var ipBlocklist = new IPBlocklist()

    ipBlocklist.load(filePath)
      .then(function () {
        var result = ipBlocklist.contains('3.0.0.0')
        t.equal(result, false, 'return true for found ip')
        t.end()
      })
  }
)

test(
  'clear blocklist',
  function (t) {
    var ipBlocklist = new IPBlocklist()

    ipBlocklist.load(filePath)
      .then(function () {
        ipBlocklist.clear()
        t.deepEqual(ipBlocklist.ipsByPrefixLength, {}, 'empty ipsByPrefixLength object')
        t.equal(ipBlocklist.prefixLengths.length, 0, 'empty ip prefix')
        t.end()
      })
  }
)

test(
  'refresh blocklist',
  function (t) {
    var ipBlocklist = new IPBlocklist()

    ipBlocklist.load(filePath)
      .then(function () {
        return ipBlocklist.refresh()
      })
      .then(function () {
        t.end()
      })
      .catch(function (err) {
        t.fail(err)
        t.end()
      })
  }
)
