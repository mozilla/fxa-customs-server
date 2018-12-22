#!/bin/sh

# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

node_modules/.bin/grunt lint copyright || exit 1

cov=""
if test "$NO_COVERAGE" = ""; then
  cov="--coverage --cov"
fi

if ! echo stats | nc localhost 11211 | grep -q 'STAT'; then
  memcached &
  MC=$!
fi

tap test/local test/remote $cov

if [ -n "$MC" ]; then
  kill $MC
fi
