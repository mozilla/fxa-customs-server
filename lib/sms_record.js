/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var actions = require('./actions')

// Keep track of events tied to specific sms number
module.exports = function (limits, now) {

  now = now || Date.now

  function SMSRecord() {
    this.xs = []
  }

  SMSRecord.parse = function (object) {
    var rec = new SMSRecord()
    object = object || {}
    rec.rl = object.rl       // timestamp when the account was rate-limited
    rec.xs = object.xs || [] // timestamps when sms were sent
    return rec
  }

  SMSRecord.prototype.getMinLifetimeMS = function () {
    return limits.smsRateLimitIntervalMs
  }

  SMSRecord.prototype.isOverSMSLimit = function () {
    this.trimHits(now())
    return this.xs.length > limits.maxSMSs
  }

  SMSRecord.prototype.trimHits = function (now) {
    if (this.xs.length === 0) { return }
    // xs is naturally ordered from oldest to newest
    // and we only need to keep up to limits.sms + 1

    var i = this.xs.length - 1
    var n = 0
    var hit = this.xs[i]
    while (hit > (now - limits.smsRateLimitIntervalMs) && n <= limits.maxSMSs) {
      hit = this.xs[--i]
      n++
    }
    this.xs = this.xs.slice(i + 1)
  }

  SMSRecord.prototype.addHit = function () {
    this.xs.push(now())
  }

  SMSRecord.prototype.isRateLimited = function () {
    return !!(this.rl && (now() - this.rl < limits.smsRateLimitIntervalMs))
  }

  SMSRecord.prototype.rateLimit = function () {
    this.rl = now()
    this.xs = []
  }

  SMSRecord.prototype.retryAfter = function () {
    var rateLimitAfter = Math.ceil(((this.rl || 0) + limits.smsRateLimitIntervalMs - now()) / 1000)
    return Math.max(0, rateLimitAfter)
  }

  SMSRecord.prototype.update = function (action) {

    if (this.isRateLimited()) {
      return this.retryAfter()
    }

    if (actions.isSMSSendingAction(action)) {
      this.addHit()

      if (this.isOverSMSLimit()) {
        this.rateLimit()
        return this.retryAfter()
      }
    }

    return 0
  }

  return SMSRecord
}
