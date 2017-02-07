/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var Memcached = require('memcached')
var P = require('bluebird')
P.promisifyAll(Memcached.prototype)

module.exports = function storage(config, log) {

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

  function logMemcacheError(err) {
    log.error({ op: 'memcachedError', err: err })
    throw err
  }

  function getRecord(key) {
    return mc.getAsync(key).catch(logMemcacheError).then(obj => {
      return new Record(key, obj)
    })
  }

  function setRecord(key, record) {
    var lifetime = Math.max(
      config.memcache.recordLifetimeSeconds,
      rules.getMinLifetimeMS() / 1000
    )
    return mc.setAsync(key, record, lifetime).catch(logMemcacheError)
  }

  function fetchRecords(request) {
    return P.props({
      email: request.email ? getRecord(request.email) : undefined,
      ip: request.ip ? getRecord(request.ip) : undefined,
      uid: request.uid ? getRecord(request.uid) : undefined,
    })
  }

  function updateRecords(request, records) {
    return P.all([
      request.email ? setRecord(request.email, records.email) : undefined,
      request.ip ? setRecord(request.ip, records.ip) : undefined,
      request.uid ? setRecord(request.uid, records.uid) : undefined
    ])
  }

  return {
    fetchRecords: fetchRecords,
    updateRecords: updateRecords
  }

}
