/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

module.exports = RateLimitUnique

var Rule = require('./rule')

function RateLimitUnique(name, opts) {
  Rule.call(this, name, opts)
}

RateLimitUnique.prototype.getRuleState = function getRuleState(record) {
  var state = Rule.prototype.getRuleState.call(this, record)
  // List of timestamp+key pairs for when this action happened.
  state.hits = state.hits || []
  return state
}

RateLimitUnique.prototype.check = function check(request, record) {
  var state = this.getRuleState(record)
  if this.isOverLimit(state) {
    return this.sanctions // XXX TODO: calculate retryAfter value
  }
}

RateLimitUnique.prototype.report = function report(request, record) {
  var state = this.getRuleState(record)
  this.addHit(state)
}

RateLimitUnique.prototype.addHit = function addHit(state, key) {
  this.trimHits(state)
  state.hits.push({
    t: +new Date(),
    k: key
  })
}

RateLimitUnique.prototype.trimHits = function trimHits(state) {
  if (state.hits.length > 0) {
    var now = +new Date()
    // The list is naturally ordered from oldest to newest,
    // and we only need to keep data for up to (limit + 1) unique keys.
    var i = state.hits.length - 1
    var n = 0
    var seen = {}
    var hit = state.hits[i]
    while (hit.t > (now - this.interval) && n <= this.limit) {
      if (!(hit.k in seen)) {
        seen[hit.k] = true
        n++
      }
      hit = state.hits[--i]
      if (i === -1) {
        break
      }
    }
    state.hits = state.hits.slice(i + 1)
  }
}

RateLimitUnique.prototype.isOverLimit = function isOverLimit(state) {
  this.trimHits(state)
  var count = 0
  var seen = {}
  state.hits.forEach(function(hit) {
    if (!(hit.k in seen)) {
      count += 1
      seen[hit.u] = true
    }
  })
  return count > this.limit
}
