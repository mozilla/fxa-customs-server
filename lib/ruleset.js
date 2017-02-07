/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

module.exports = RuleSet

var RULE_TYPES = {
  RateLimit: require('./rules/ratelimitunique'),
  RateLimitUnique: require('./rules/ratelimitunique'),
  WellFormedCheck: require('./rules/wellformedcheck'),
  IPBlocklist: require('./rules/ipblocklist'),
}

function RuleSet(config, storage) {
  this.storage = storage
  this.rules = {}
  Object.keys(config.rules).forEach(name => {
    this.loadRuleFromConfig(name, config.rules[name])
  })
  // XXX TODO: poll for updates
}


RuleSet.prototype.loadRuleFromConfig = function loadRuleFromConfig(name, opts) {
  var cls = RULE_TYPES[opts.type]
  if (! cls) {
    throw new Error("Unknown rule type: " + opts.type)
  }
  this.rules[name] = new cls(opts)
}


// Find all rules applicable to the given request.
// For now we just iterate over each rule and check, but
// in the future we could do some clever pre-computation to match
// each type of action directly to the list of applicable rules.

RuleSet.prototype.findApplicableRules = function findApplicableRules(request) {
  return Object.keys(this.rules).map(name => {
    return this.rules[name]
  }).filter(rule => {
    return rule.isApplicableTo(request)
  })
}
