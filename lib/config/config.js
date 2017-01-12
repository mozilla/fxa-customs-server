/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

module.exports = function (fs, path, url, convict) {

  var conf = convict({
    env: {
      doc: 'The current node.js environment',
      default: 'prod',
      format: [ 'dev', 'test', 'stage', 'prod' ],
      env: 'NODE_ENV'
    },
    log: {
      level: {
        default: 'trace',
        env: 'LOG_LEVEL'
      }
    },
    publicUrl: {
      format: 'url',
      default: 'http://127.0.0.1:7000',
      env: 'PUBLIC_URL'
    },
    listen: {
      host: {
        doc: 'The ip address the server should bind',
        default: '127.0.0.1',
        format: 'ipaddress',
        env: 'IP_ADDRESS'
      },
      port: {
        doc: 'The port the server should bind',
        default: 7000,
        format: 'port',
        env: 'PORT'
      }
    },
    updatePollIntervalSeconds: {
      doc: 'interval to check cache for new limits / allowedIPs. 0 is off',
      default: 0,
      format: 'nat',
      env: 'UPDATE_POLL_INTERVAL_SECONDS'
    },
    limits: {
      blockIntervalSeconds: {
        doc: 'Duration of a manual ban',
        default: 60 * 60 * 24,
        format: 'nat',
        env: 'BLOCK_INTERVAL_SECONDS'
      },
      rateLimitIntervalSeconds: {
        doc: 'Duration of automatic throttling',
        default: 60 * 15,
        format: 'nat',
        env: 'RATE_LIMIT_INTERVAL_SECONDS'
      },
      maxEmails: {
        doc: 'Number of emails sent within rateLimitIntervalSeconds before throttling',
        default: 3,
        format: 'nat',
        env: 'MAX_EMAILS'
      },
      maxBadLogins: {
        doc: 'Number failed login attempts within rateLimitIntervalSeconds before throttling',
        default: 2,
        format: 'nat',
        env: 'MAX_BAD_LOGINS'
      },
      maxBadLoginsPerIp: {
        doc: 'Number failed login attempts within rateLimitIntervalSeconds on a single IP before throttling',
        default: 3,
        format: 'nat',
        env: 'MAX_BAD_LOGINS_PER_IP'
      },
      maxUnblockAttempts: {
        doc: 'Number of login attempts that can be unblocked',
        default: 5,
        env: 'MAX_UNBLOCK_ATTEMPTS',
        format: 'nat'
      },
      maxVerifyCodes: {
        doc: 'Number code verifictions within rateLimitIntervalSeconds before throttling',
        default: 10,
        format: 'nat',
        env: 'MAX_VERIFY_CODES'
      },
      badLoginErrnoWeights: {
        doc: 'Maps bad-login errnos to a weight multipler, because some bad logins are badder than others',
        format: Object,
        env: 'BAD_LOGIN_ERRNO_WEIGHTS',
        default: {
          '102': 2,
          '125': 4,
          '126': 2
        }
      },
      ipRateLimitIntervalSeconds: {
        doc: 'Duration of automatic throttling for IPs',
        default: 60 * 15,
        format: 'nat',
        env: 'IP_RATE_LIMIT_INTERVAL_SECONDS'
      },
      ipRateLimitBanDurationSeconds: {
        doc: 'Duration of automatic ban for throttled IPs',
        default: 60 * 15,
        format: 'nat',
        env: 'IP_RATE_LIMIT_BAN_DURATION_SECONDS'
      },
      uidRateLimit: {
        limitIntervalSeconds: {
          doc: 'Duration of automatic throttling for uids',
          default: 60 * 15,
          format: 'nat',
          env: 'UID_RATE_LIMIT_INTERVAL_SECONDS'
        },
        banDurationSeconds: {
          doc: 'Duration of automatic ban',
          default: 60 * 15,
          format: 'nat',
          env: 'UID_RATE_LIMIT_BAN_DURATION_SECONDS'
        },
        maxChecks: {
          doc: 'Number of checks within uidRateLimitBanDurationSeconds before blocking',
          default: 100,
          format: 'nat',
          env: 'UID_RATE_LIMIT'
        }
      },
      maxAccountStatusCheck: {
        doc: 'Number of account status checks within rateLimitIntervalSeconds before throttling',
        default: 5,
        format: 'nat',
        env: 'MAX_ACCOUNT_STATUS_CHECK'
      }
    },
    memcache: {
      address: {
        doc: 'Hostname/IP:Port of the memcache server',
        default: '127.0.0.1:11211',
        env: 'MEMCACHE_ADDRESS'
      },
      recordLifetimeSeconds: {
        doc: 'Memcache record expiry',
        default: 900,
        format: 'nat',
        env: 'RECORD_LIFETIME_SECONDS'
      }
    },
    bans: {
      region: {
        doc: 'The region where the queues live, most likely the same region we are sending email e.g. us-east-1, us-west-2, ap-southeast-2',
        format: String,
        default: '',
        env: 'BANS_REGION'
      },
      queueUrl: {
        doc: 'The bounce queue URL to use (should include https://sqs.<region>.amazonaws.com/<account-id>/<queue-name>)',
        format: String,
        default: '',
        env: 'BANS_QUEUE_URL'
      }
    },
    allowedIPs: {
      doc: 'An array of IPs that will not be blocked or rate-limited.',
      format: Array,
      env: 'ALLOWED_IPS',
      default: []
    },
    allowedEmailDomains: {
      doc: 'An array of email domains that will not be blocked or rate-limited.',
      format: Array,
      env: 'ALLOWED_EMAIL_DOMAINS',
      // These are emails frequently used for testing purposes
      default: [
        'restmail.net',
        'restmail.dev.lcip.org'
      ]
    },
    requestChecks: {
      treatEveryoneWithSuspicion: {
        doc: 'Whether to flag all requests as suspicious by default',
        format: Boolean,
        default: false,
        env: 'TREAT_EVERYONE_WITH_SUSPICION'
      }
      // The private branch puts some additional private config here.
    },
    ipBlocklist: {
      enable: {
        doc: 'Flag to enable ip blocklist',
        format: Boolean,
        default: false,
        env: 'IP_BLOCKLIST_ENABLE'
      },
      logOnly: {
        doc: 'Flag to only log hits',
        format: Boolean,
        default: true,
        env: 'IP_BLOCKLIST_LOGONLY'
      },
      lists: {
        doc: 'A array of ip blocklist file paths',
        format: Array,
        default: [],
        env: 'IP_BLOCKLIST_FILES'
      },
      updatePollInterval: {
        doc: 'Poll interval for checking for updated lists (seconds)',
        default: 300,
        format: 'nat',
        env: 'IP_BLOCKLIST_POLL_INTERVAL_SECONDS'
      }
    },
    reputationService: {
      enable: {
        doc: 'Flag to enable using the IP Reputation Service',
        format: Boolean,
        default: false,
        env: 'REPUTATION_SERVICE_ENABLE'
      },
      enableCheck: {
        doc: 'Flag to enable fetching reputation for IPs on /check route',
        format: Boolean,
        default: false,
        env: 'REPUTATION_SERVICE_ENABLE_CHECK'
      },
      suspectBelow: {
        doc: 'Suspect /check requests from IPs with reputation less than this',
        format: 'int',
        default: 0,
        env: 'REPUTATION_SERVICE_SUSPECT_BELOW'
      },
      blockBelow: {
        doc: 'Block /check requests from IPs with reputation less than this',
        format: 'int',
        default: 0,
        env: 'REPUTATION_SERVICE_BLOCK_BELOW'
      },
      host: {
        doc: 'The reputation service IP address',
        default: '127.0.0.1',
        format: 'ipaddress',
        env: 'REPUTATION_SERVICE_IP_ADDRESS'
      },
      port: {
        doc: 'The reputation service port',
        default: 8080,
        format: 'port',
        env: 'REPUTATION_SERVICE_PORT'
      },
      hawkId: {
        doc: 'HAWK ID for sending blocked IPs to the IP Reputation Service',
        default: 'root',
        format: String,
        env: 'REPUTATION_SERVICE_HAWK_ID'
      },
      hawkKey: {
        doc: 'HAWK key for sending blocked IPs to the IP Reputation Service',
        default: 'toor',
        format: String,
        env: 'REPUTATION_SERVICE_HAWK_KEY'
      },
      timeout: {
        doc: 'timeout in ms to wait for requests sent to the IP Reputation Service',
        default: 50,
        format: 'int',
        env: 'REPUTATION_SERVICE_TIMEOUT'
      }
    }
  })

  // handle configuration files.  you can specify a CSV list of configuration
  // files to process, which will be overlayed in order, in the CONFIG_FILES
  // environment variable. By default, the ./config/<env>.json file is loaded.

  var envConfig = path.join(path.dirname(path.dirname(__dirname)), 'config', conf.get('env') + '.json')
  var files = (envConfig + ',' + process.env.CONFIG_FILES)
                .split(',').filter(fs.existsSync)
  conf.loadFile(files)
  conf.validate({ strict: true })

  return conf
}
