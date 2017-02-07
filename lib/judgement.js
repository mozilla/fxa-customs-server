/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

module.exports = Judgement

function Judgement(options) {
  this.triggeredRules = options.triggeredRules || []
  this.suspect = options.suspect || false
  this.block = options.block || false
  this.retryAfter = options.retryAfter || 0
  this.canUnblock = options.canUnblock || true
}

Judgement.prototype.include = function include(rule, sanctions, record) {
  this.triggeredRules.push(rule.name)
  Object.keys(sanctions).forEach(key => {
    var arg = sanctions[key]
    switch (key) {
      case "suspect":
        this.suspect = this.suspect || arg
        break
      case "block":
        this.block = this.block || arg
        break
      case "retryAfter":
        this.retryAfter = Math.max(this.retryAfter, arg)
        break
      case "canUnblock":
        this.canUnblock = this.canUnblock && arg
        break
      case "ban":
        this.block = true
        record.banFor(arg)
        break
      default:
        throw new Error("Unknown type of sanction: " + key)
    }
  })
}
