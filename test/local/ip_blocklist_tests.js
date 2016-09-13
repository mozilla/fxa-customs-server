/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

require('ass')
var test = require('tap').test

var log = {
  info: function () {},
  error: function () {},
  trace: function () {}
}

var config = {
  blocklist: {
    updatePollInterval: 1 // 1 Second
  }
}

var IPBlocklist = require('../../lib/ip_blocklist')(log, config)
var IPBlocklistManager = require('../../lib/ip_blocklist_manager')(log, config)

var lists = [
  './test/mocks/firehol_level1.netset',
  './test/mocks/simple.netset'
]

var commonTestCases = [
  {
    name: 'IPBlocklist',
    blocklistClass: IPBlocklist,
    list: lists[0]
  },
  {
    name: 'IPBlocklistManager',
    blocklistClass: IPBlocklistManager,
    list: lists
  }
]

commonTestCases.forEach(function (testCase) {
  var BlocklistClass = testCase.blocklistClass
  var filePath = testCase.list
  var name = testCase.name

  test(
    name + ', calling contains without loading csv return false',
    function (t) {
      var ipBlocklist = new BlocklistClass()
      var result = ipBlocklist.contains('0.0.0.0')
      t.equal(result, false, 'should not have found ip')
      t.end()
    }
  )


  test(
    name + ', load ip blocklist',
    function (t) {
      var ipBlocklist = new BlocklistClass()

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
    name + ', returns true for empty ip',
    function (t) {
      var ipBlocklist = new BlocklistClass()

      ipBlocklist.load(filePath)
        .then(function () {
          var result = ipBlocklist.contains()
          t.equal(result, true, 'return true for empty ip')
          t.end()
        })
    }
  )

  test(
    name + ', returns true for invalid ip',
    function (t) {
      var ipBlocklist = new BlocklistClass()

      ipBlocklist.load(filePath)
        .then(function () {
          var result = ipBlocklist.contains('notip')
          t.equal(result, true, 'return true for invalid ip')
          t.end()
        })
    }
  )

  test(
    name + ', returns true for ip in blocklist',
    function (t) {
      var ipBlocklist = new BlocklistClass()

      ipBlocklist.load(filePath)
        .then(function () {
          var result = ipBlocklist.contains('1.93.0.224')
          t.equal(result, true, 'return true for found ip')
          t.end()
        })
    }
  )

  test(
    name + ', returns true for ip in blocklist range',
    function (t) {
      var ipBlocklist = new BlocklistClass()

      ipBlocklist.load(filePath)
        .then(function () {
          var result = ipBlocklist.contains('0.0.0.1')
          t.equal(result, true, 'return true for found ip')
          t.end()
        })
    }
  )

  test(
    name + ', returns false for ip not in blocklist',
    function (t) {
      var ipBlocklist = new BlocklistClass()

      ipBlocklist.load(filePath)
        .then(function () {
          var result = ipBlocklist.contains('12.34.32.1')
          t.equal(result, false, 'return false for not found ip')
          t.end()
        })
    }
  )

  test(
    name + ', returns false for ip not in blocklist range',
    function (t) {
      var ipBlocklist = new BlocklistClass()

      ipBlocklist.load(filePath)
        .then(function () {
          var result = ipBlocklist.contains('3.0.0.0')
          t.equal(result, false, 'return true for found ip')
          t.end()
        })
    }
  )
})

// Clear and Refresh test cases are not similar for IPBlocklist
// and IPBlocklistManager
test(
  'IPBlocklist, clear blocklist',
  function (t) {
    var ipBlocklist = new IPBlocklist()

    ipBlocklist.load(lists[0])
      .then(function () {
        ipBlocklist.clear()
        t.deepEqual(ipBlocklist.ipsByPrefixLength, {}, 'empty ipsByPrefixLength object')
        t.equal(ipBlocklist.prefixLengths.length, 0, 'empty ip prefix')
        t.end()
      })
  }
)

test(
  'IPBlocklist, refresh blocklist',
  function (t) {
    var ipBlocklist = new IPBlocklist()

    ipBlocklist.load(lists[0])
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

test(
  'IPBlocklistManager, clear blocklist',
  function (t) {
    var ipBlocklist = new IPBlocklistManager()

    ipBlocklist.load(lists)
      .then(function () {
        ipBlocklist.clear()
        t.equal(ipBlocklist.ipBlocklists.length, 0, 'empty blocklist')
        t.end()
      })
  }
)
