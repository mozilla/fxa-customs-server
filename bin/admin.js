#!/usr/bin/env node

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var admin = require('../lib/admin')
var config = require('../lib/config').root()
var log = require('../lib/log')(config.log.level, 'customs-server')

function shutdown() {
  process.nextTick(process.exit)
}

if (process.env.ASS_CODE_COVERAGE) {
  process.on('SIGINT', shutdown)
}

admin(config, log).apply(this, process.argv.slice(2)).then(
  function () {
    console.log('OK')
  },
  function (err) {
    console.log('ERROR: ', err)
  }
).finally(shutdown)
