<a name="1.98.0"></a>
# 1.98.0 (2017-10-26)


### chore

* **docker:** Update to node v6.11.5 for security fix ([290e678](https://github.com/mozilla/fxa-customs-server/commit/290e678))



<a name="1.92.0"></a>
# 1.92.0 (2017-07-26)


### Bug Fixes

* **docs:** document the dependency on memcached (#211) r=vladikoff ([32f9083](https://github.com/mozilla/fxa-customs-server/commit/32f9083))
* **server:** remove mozdef integration (#209) ([a682ae4](https://github.com/mozilla/fxa-customs-server/commit/a682ae4)), closes [#204](https://github.com/mozilla/fxa-customs-server/issues/204)



<a name="1.91.0"></a>
# 1.91.0 (2017-07-12)


### Bug Fixes

* **nodejs:** upgrade to 6.11.1 for security fixes ([ef20449](https://github.com/mozilla/fxa-customs-server/commit/ef20449))

### Features

* **node:** upgrade to Node 6 (#208) ([7b20330](https://github.com/mozilla/fxa-customs-server/commit/7b20330))



<a name="1.90.0"></a>
# 1.90.0 (2017-06-28)




<a name="1.89.0"></a>
# 1.89.0 (2017-06-28)




<a name="1.88.0"></a>
# 1.88.0 (2017-05-31)


### Features

* **actions:** add consumeSigninCode as an ACCOUNT_ACCESS_ACTION ([08fca60](https://github.com/mozilla/fxa-customs-server/commit/08fca60))
* **docker:** add custom feature branch (#202) r=jrgm ([159d53b](https://github.com/mozilla/fxa-customs-server/commit/159d53b))



<a name="1.86.0"></a>
# 1.86.0 (2017-05-03)


### Bug Fixes

* **settings:** pushOnMissing no longer updates on unexpected errors ([a720749](https://github.com/mozilla/fxa-customs-server/commit/a720749)), closes [#194](https://github.com/mozilla/fxa-customs-server/issues/194)
* **sms:** Add ability to rate-limit sms by email (#198), r=@rfk ([e2f206c](https://github.com/mozilla/fxa-customs-server/commit/e2f206c))

### chore

* **deps:** Update shrinkwrap ([da6765a](https://github.com/mozilla/fxa-customs-server/commit/da6765a))

### Features

* **emails:** Add `createEmail` to email sending endpoints (#199) r=vladikoff ([b412411](https://github.com/mozilla/fxa-customs-server/commit/b412411)), closes [#180](https://github.com/mozilla/fxa-customs-server/issues/180)



<a name="1.85.0"></a>
# 1.85.0 (2017-04-19)


### Bug Fixes

* **security:** escape json output (#193) r=vladikoff ([720e7de](https://github.com/mozilla/fxa-customs-server/commit/720e7de))

### chore

* **docker:** Use official node image & update to Node.js v4.8.2 (#196) r=vladikoff ([e7dd3c1](https://github.com/mozilla/fxa-customs-server/commit/e7dd3c1))



<a name="1.84.0"></a>
# 1.84.0 (2017-04-04)


### Bug Fixes

* **tests:** Correctly rate limit sms by ip address (#191), r=@rfk ([2a70689](https://github.com/mozilla/fxa-customs-server/commit/2a70689))



<a name="1.83.0"></a>
# 1.83.0 (2017-03-21)


### Bug Fixes

* **docs:** Add notes for sms (#184), r=@shane-tomlinson ([1cd55b1](https://github.com/mozilla/fxa-customs-server/commit/1cd55b1))
* **tests:** Update config and testing for sms (#189) r=vladikoff ([8fef3d1](https://github.com/mozilla/fxa-customs-server/commit/8fef3d1))



<a name="1.82.0"></a>
# 1.82.0 (2017-03-08)


### Bug Fixes

* **shutdown:** Fix deferred call of process.exit(code). (#183); r=jrgm ([30be845](https://github.com/mozilla/fxa-customs-server/commit/30be845)), closes [(#183](https://github.com/(/issues/183)

### chore

* **changelog:** Update the changelog ([c0434db](https://github.com/mozilla/fxa-customs-server/commit/c0434db))
* **docs:** add circle ci badge to README ([63f30f6](https://github.com/mozilla/fxa-customs-server/commit/63f30f6))
* **package:** Use ip-rep service client with keepalive enabled (#181) r=vladikoff ([7c2b774](https://github.com/mozilla/fxa-customs-server/commit/7c2b774))

### Features

* **docker:** add Docker support (#176) r=vladikoff,jbuck ([b0cb1fa](https://github.com/mozilla/fxa-customs-server/commit/b0cb1fa))



<a name="1.81.0"></a>
# 1.81.0 (2017-02-24)


### Bug Fixes

* **config-set:** Don't attempt to merge array-valued config items. (#171); r=jrgm ([310fafb](https://github.com/mozilla/fxa-customs-server/commit/310fafb))
* **reputation:** add more (positive) logging to reputation service requests (#179), r=@vbudhram ([a521224](https://github.com/mozilla/fxa-customs-server/commit/a521224))

### Features

* **blocklist:** Add support to specify the block level for multiple blocklists (#167), r=@rfk ([14e37c3](https://github.com/mozilla/fxa-customs-server/commit/14e37c3))



<a name="0.80.0"></a>
# 0.80.0 (2017-02-16)


### Bug Fixes

* **startup:** Exit process on any startup error. (#169), r=@rfk ([7a56e8b](https://github.com/mozilla/fxa-customs-server/commit/7a56e8b))
* **tests:** remove old code coverage tool (#173), r=@vbudhram ([84d6ca4](https://github.com/mozilla/fxa-customs-server/commit/84d6ca4)), closes [#164](https://github.com/mozilla/fxa-customs-server/issues/164)
* **timers:** Unref all the update-polling timers. (#170); r=vbudhram ([c5002be](https://github.com/mozilla/fxa-customs-server/commit/c5002be))

### Features

* **sms:** Add support for rate-limiting sms actions (#161), r=@philbooth, @rfk ([dd30b0e](https://github.com/mozilla/fxa-customs-server/commit/dd30b0e))

### Refactor

* **tests:** Add ability to debug child processes (#162), r=@rfk ([7a73ca4](https://github.com/mozilla/fxa-customs-server/commit/7a73ca4))



<a name="0.79.0"></a>
# 0.79.0 (2017-01-25)


### Bug Fixes

* **retryAfter:** Round blocking periods up instead of down. (#159), r=@vbudhram ([a9f1932](https://github.com/mozilla/fxa-customs-server/commit/a9f1932))
* **test:** increase rateLimitInterval for send_violation_tests (#157), r=@vbudhram ([262c210](https://github.com/mozilla/fxa-customs-server/commit/262c210))

### Features

* **config:** Merge with existing config when writing to memcache. (#151) r=vladikoff ([a8f4d68](https://github.com/mozilla/fxa-customs-server/commit/a8f4d68))
* **ipreputation:** Use IP reputation service from /check (#152), r=@vbudhram ([4f5d781](https://github.com/mozilla/fxa-customs-server/commit/4f5d781))



<a name="0.78.0"></a>
# 0.78.0 (2017-01-11)


### Bug Fixes

* **config:** remove mockmyid rate limit, add second restmail (#156); r=rfk ([d61ac26](https://github.com/mozilla/fxa-customs-server/commit/d61ac26))
* **docs:** Add note about commit messages (#155); r=rfk ([da057a2](https://github.com/mozilla/fxa-customs-server/commit/da057a2))

### chore

* **shrinkwrap:** add npm script for shrinkwrap (#150) r=vladikoff ([e84a4be](https://github.com/mozilla/fxa-customs-server/commit/e84a4be)), closes [#149](https://github.com/mozilla/fxa-customs-server/issues/149)



<a name="0.72.1"></a>
## 0.72.1 (2016-10-26)


### Bug Fixes

* **ip_record:** Correctly total bad logins by unique email address. ([4f20fad](https://github.com/mozilla/fxa-customs-server/commit/4f20fad))



<a name="0.72.0"></a>
# 0.72.0 (2016-10-19)


### Bug Fixes

* **blocklist:** Convert date to milliseconds for file comparison (#143); r=rfk ([dfc173e](https://github.com/mozilla/fxa-customs-server/commit/dfc173e))
* **logging:** Don't attempt to log a 'msg' field. ([01d8e3d](https://github.com/mozilla/fxa-customs-server/commit/01d8e3d))
* **unblock:** Return `unblock` value for IPs on a blocklist ([fa2c306](https://github.com/mozilla/fxa-customs-server/commit/fa2c306))

### chore

* **config:** Don't set allow ALLOWED_IPS by default. (#138); r=jrgm ([9545e7d](https://github.com/mozilla/fxa-customs-server/commit/9545e7d))
* **lint:** Fix up some linty issues noticed in PR review. ([623de15](https://github.com/mozilla/fxa-customs-server/commit/623de15))

### Features

* **blocklist:** Add latest firehol sample list (#144); r=rfk ([9f23903](https://github.com/mozilla/fxa-customs-server/commit/9f23903))
* **requestChecks:** Backport "requestChecks" framework from private repo. ([5ddfcf1](https://github.com/mozilla/fxa-customs-server/commit/5ddfcf1))



<a name="0.71.0"></a>
# 0.71.0 (2016-10-05)


### Bug Fixes

* **dependencies:** update restify to 4.1.1 (#135); r=rfk ([9a7b93a](https://github.com/mozilla/fxa-customs-server/commit/9a7b93a))
* **settings:** Fix reloading of nested settings from mecmached (#133); r=vbudhram ([101062c](https://github.com/mozilla/fxa-customs-server/commit/101062c)), closes [(#133](https://github.com/(/issues/133)

### Features

* **blocklist:** Add blocklist module (#117), r=@rfk, @seanmonstar ([029111d](https://github.com/mozilla/fxa-customs-server/commit/029111d))
* **unblock:** add unblock rate limits (#131); r=rfk ([03c8c02](https://github.com/mozilla/fxa-customs-server/commit/03c8c02))
* **verify-code:** Add rate-limiting of code verification attempts. (#132); r=vbudhram ([1dc03ef](https://github.com/mozilla/fxa-customs-server/commit/1dc03ef))



<a name="0.69.0"></a>
# 0.69.0 (2016-09-08)


### feature

* **newrelic:** add optional newrelic integration ([bac4bbc](https://github.com/mozilla/fxa-customs-server/commit/bac4bbc))



<a name="0.67.0"></a>
# 0.67.0 (2016-08-11)


### Bug Fixes

* **ip:** Rate-limit all status-checking actions per IP. ([9a4eaf5](https://github.com/mozilla/fxa-customs-server/commit/9a4eaf5))

### chore

* **release:** Add changelog for v0.66.0 ([ca57b82](https://github.com/mozilla/fxa-customs-server/commit/ca57b82))
* **server:** Remove some left-over references to account lockout. (#124) r=vladikoff ([383412c](https://github.com/mozilla/fxa-customs-server/commit/383412c))

### Features

* **block:** ip record blocks trump all other conditions ([112277f](https://github.com/mozilla/fxa-customs-server/commit/112277f))
* **server:** Add uid_record and checkAuthenticated endpoint (#121) r=vladikoff,rfk ([3a254c4](https://github.com/mozilla/fxa-customs-server/commit/3a254c4))

### Refactor

* **test:** Modify test cases to use promises instead of callbacks (#123) r=vladikoff ([6fadc52](https://github.com/mozilla/fxa-customs-server/commit/6fadc52)), closes [#97](https://github.com/mozilla/fxa-customs-server/issues/97)



<a name="0.66.0"></a>
# 0.66.0 (2016-07-27)


### Bug Fixes

* **tests:** add coveralls and enforce coverage ([c236800](https://github.com/mozilla/fxa-customs-server/commit/c236800)), closes [#12](https://github.com/mozilla/fxa-customs-server/issues/12)

### Features

* **server:** Remove `badLoginLockout` config and EmailRecord.lf (loginFailure) related code. ([28343cb](https://github.com/mozilla/fxa-customs-server/commit/28343cb))
* **server:** Remove account lockout. ([f409c6f](https://github.com/mozilla/fxa-customs-server/commit/f409c6f)), closes [#120](https://github.com/mozilla/fxa-customs-server/issues/120)



<a name="0.64.0"></a>
# 0.64.0 (2016-06-22)


### chore

* **travis:** drop node 0.12 ([5bb758c](https://github.com/mozilla/fxa-customs-server/commit/5bb758c))



<a name="0.61.0"></a>
# 0.61.0 (2016-05-04)


### Features

* **email:** Add config option to avoid blocking certain email domains ([e578c26](https://github.com/mozilla/fxa-customs-server/commit/e578c26))
* **scripts:** added admin scripts: block-ip and customs-info ([5405ac5](https://github.com/mozilla/fxa-customs-server/commit/5405ac5))



<a name="0.60.1"></a>
## 0.60.1 (2016-04-20)




<a name="0.60.0"></a>
# 0.60.0 (2016-04-19)


### Bug Fixes

* **blocking:** Merge and now blocks all request on server-side error ([484ff0c](https://github.com/mozilla/fxa-customs-server/commit/484ff0c))
* **blocking:** Send block for all requests if memcache is down ([721dffe](https://github.com/mozilla/fxa-customs-server/commit/721dffe))
* **blocking:** Send block for all requests if memcache is down ([6955b6a](https://github.com/mozilla/fxa-customs-server/commit/6955b6a))
* **check:** Include more action names in various checks. ([a8f5892](https://github.com/mozilla/fxa-customs-server/commit/a8f5892))
* **config:** add more config to ip rate limits ([f52d913](https://github.com/mozilla/fxa-customs-server/commit/f52d913))
* **config:** update name values for ip ban ([92a0008](https://github.com/mozilla/fxa-customs-server/commit/92a0008))
* **handler:** add new config values to handler.js ([5ca3052](https://github.com/mozilla/fxa-customs-server/commit/5ca3052))
* **ip:** Be less aggressive about extending IP rate-limit duration. ([b8469d4](https://github.com/mozilla/fxa-customs-server/commit/b8469d4))
* **ip:** Don't rate-limit email sending based on IP address alone. ([6c2f892](https://github.com/mozilla/fxa-customs-server/commit/6c2f892))
* **ip:** Pass updated config params to ip_record in the ban-handling script. ([09dd129](https://github.com/mozilla/fxa-customs-server/commit/09dd129))
* **iprecord:** Fix calls to IpRecord.addBadLogin ([13c339a](https://github.com/mozilla/fxa-customs-server/commit/13c339a))
* **ips:** Add ALLOWED_IPS environment variable for config. ([4456e35](https://github.com/mozilla/fxa-customs-server/commit/4456e35))
* **lifetime:** ensure memcache lifetime is set in more places ([3c3c722](https://github.com/mozilla/fxa-customs-server/commit/3c3c722))
* **lifetime:** Ensure records are written with sufficient ttls in memcache. ([5aff49c](https://github.com/mozilla/fxa-customs-server/commit/5aff49c))
* **lock:** add ip lock test ([30f8a5d](https://github.com/mozilla/fxa-customs-server/commit/30f8a5d))
* **logins:** add docs and simplify test ([ed6790f](https://github.com/mozilla/fxa-customs-server/commit/ed6790f))
* **logins:** add test and adjust rate limit ([8d94c1c](https://github.com/mozilla/fxa-customs-server/commit/8d94c1c))
* **logins:** combine limiting for bad logins and rate ([2f0aa17](https://github.com/mozilla/fxa-customs-server/commit/2f0aa17))
* **style:** Fix some typos ([cafe245](https://github.com/mozilla/fxa-customs-server/commit/cafe245))
* **tests:** adjust config values for status check ([746e9d5](https://github.com/mozilla/fxa-customs-server/commit/746e9d5))
* **tests:** adjust login tests ([7c4de25](https://github.com/mozilla/fxa-customs-server/commit/7c4de25))

### chore

* **deps:** updated deps ([9ad5ac9](https://github.com/mozilla/fxa-customs-server/commit/9ad5ac9))

### Features

* **config:** Allow config to be udpated via memcached ([8fa354a](https://github.com/mozilla/fxa-customs-server/commit/8fa354a))
* **ip:** Add config option for list of allowed ips. ([2632ae7](https://github.com/mozilla/fxa-customs-server/commit/2632ae7))
* **ip:** Count IP rate limits based on unique emails only. ([2773c40](https://github.com/mozilla/fxa-customs-server/commit/2773c40))
* **iprecord:** record errno and ratelimit when errno is 102 ([37b4a1a](https://github.com/mozilla/fxa-customs-server/commit/37b4a1a))
* **login:** Allow different bad-login errnos to have different weights. ([50c84e5](https://github.com/mozilla/fxa-customs-server/commit/50c84e5))
* **logins:** Count rate-limited login attempts as failed logins. ([4761653](https://github.com/mozilla/fxa-customs-server/commit/4761653))



<a name="0.57.0"></a>
# 0.57.0 (2016-03-01)


### Bug Fixes

* **config:** restore top-level "config" dir for $(NODE_ENV).json files. ([b853875](https://github.com/mozilla/fxa-customs-server/commit/b853875))

### Features

* **api:** Add check account status ([4df20b8](https://github.com/mozilla/fxa-customs-server/commit/4df20b8))

### Refactor

* **lib:** Put all the code inside a "lib" subdirectory. ([493984a](https://github.com/mozilla/fxa-customs-server/commit/493984a))



<a name="0.55.0"></a>
# 0.55.0 (2016-01-31)


### Bug Fixes

* **build:** add grunt-nsp ([816ae95](https://github.com/mozilla/fxa-customs-server/commit/816ae95))
* **travis:** build and test on 0.10, 0.12 and 4.x ([4922a10](https://github.com/mozilla/fxa-customs-server/commit/4922a10))
* **travis:** remove broken validate-shrinkwrap ([f01517b](https://github.com/mozilla/fxa-customs-server/commit/f01517b))

### chore

* **docs:** remove misleading reference to awsbox ([8f9c06f](https://github.com/mozilla/fxa-customs-server/commit/8f9c06f))



<a name="0.45.0"></a>
# 0.45.0 (2015-09-13)


### chore

* **build:** Replace JSHint with ESLint ([dad97a5](https://github.com/mozilla/fxa-customs-server/commit/dad97a5))
* **shrinkwrap:** update npm-shrinkwrap ([cc6444b](https://github.com/mozilla/fxa-customs-server/commit/cc6444b))
* **travis:** Tell Travis to use #fxa-bots ([f835276](https://github.com/mozilla/fxa-customs-server/commit/f835276))
* **version:** generate legacy-format output for ./config/version.json ([129d885](https://github.com/mozilla/fxa-customs-server/commit/129d885))



<a name="0.39.0"></a>
# 0.39.0 (2015-06-10)


### chore

* **config:** Update convict and switch on strict validation. ([d2168f9](https://github.com/mozilla/fxa-customs-server/commit/d2168f9))
* **license:** Update license to be SPDX compliant ([237f745](https://github.com/mozilla/fxa-customs-server/commit/237f745))
* **shrinkwrap:** update ass to what other modules use; update shrinkwrap ([06920e5](https://github.com/mozilla/fxa-customs-server/commit/06920e5))



<a name="0.36.0"></a>
# 0.36.0 (2015-04-28)


### chore

* **travis:** build/test on 0.10, 0.12, and iojs ([2818e43](https://github.com/mozilla/fxa-customs-server/commit/2818e43))
* **travis:** quiet validate-shrinkwrap failure on security warning on module ([4b93b2b](https://github.com/mozilla/fxa-customs-server/commit/4b93b2b))

### docs

* **changelog:** changelog for train-34 ([9f299cc](https://github.com/mozilla/fxa-customs-server/commit/9f299cc))



<a name="0.34.0"></a>
# 0.34.0 (2015-04-02)


### Bug Fixes

* **release:** add tasks "grunt version" and "grunt version:patch" to create release tags ([532f8c2](https://github.com/mozilla/fxa-customs-server/commit/532f8c2))
* **tests:** files were not being linted; so now, make jshint happy ([152b7f8](https://github.com/mozilla/fxa-customs-server/commit/152b7f8))

### chore

* **shrinkwrap:** update shrinkwrap ([e9c5d91](https://github.com/mozilla/fxa-customs-server/commit/e9c5d91))



<a name="0.33.0"></a>
# 0.33.0 (2015-03-17)


### Bug Fixes

* **config:** fix units typo in default config ([6befc10](https://github.com/mozilla/fxa-customs-server/commit/6befc10))

### Features

* **config:** Add a badLoginLockoutIntervalSeconds configuration option. ([429eec1](https://github.com/mozilla/fxa-customs-server/commit/429eec1)), closes [#75](https://github.com/mozilla/fxa-customs-server/issues/75)
* **docs:** Include a snipped about the memcached requirement. ([2446f1a](https://github.com/mozilla/fxa-customs-server/commit/2446f1a)), closes [#77](https://github.com/mozilla/fxa-customs-server/issues/77)


# Older Versions

0.6.0
  * Add more logging when handling sqs ban events - #73

0.5.0
  * Block all actions for emails that are explicitly banned - #70

0.4.0
  * Validation errors should return 400 errors, not 500 - #68
  * Document the current blocking and rate-limiting policies - #63

0.3.0
  * Add support for account lockout on excessive login attempts - #58, #60
  * normalize email addresses (compare the lower case values) - #59, #62

0.2.0
  * update request and restify for new qs module
  * update ass version
  * use npm shrinkwrap

0.1.1
  * Remove redundant memcache.host and memcache.port settings
  * expose all configuration settings to the environment; add option memcache.address to work with previous puppet settings
  * removing npm spinner from travis logs

0.1.0
  * init
