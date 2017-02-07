/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var fs = require('fs')
var path = require('path')
var url = require('url')
var convict = require('convict')

module.exports = function () {

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
    allowedIPs: {
      doc: 'An array of IPs that will not be blocked or rate-limited.',
      format: Array,
      env: 'ALLOWED_IPS',
      default: []
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
    rules: {
      format: Object,
      default: {

        limit_logins_15min: {
          type: 'RateLimit',
          action: 'checkPassword',
          config: {
            limit: 5,
            period: '15 minutes'
          }
        },

        limit_logins_daily: {
          type: 'RateLimit',
          action: 'checkPassword',
          config: {
            limit: 30,
            period: '1 day'
          }
        },

        limit_email_sending_15min: {
          type: 'RateLimit',
          action: 'sendEmail',
          config: {
            limit: 3,
            period: '15 minutes'
          }
        },

        limit_email_sending_daily: {
          type: 'RateLimit',
          action: 'sendEmail',
          config: {
            limit: 20,
            period: '1 day'
          }
        },

        limit_unique_logins_by_ip_15min: {
          type: 'RateLimitUnique',
          action: 'checkPassword',
          config: {
            limit: 10,
            period: '15 minutes'
          }
        },

        limit_unique_logins_by_ip_hourly: {
          type: 'RateLimitUnique',
          action: 'checkPassword',
          config: {
            limit: 20,
            period: '1 hour'
          },
          sanctions: {
            block: true,
            ban: '6 hours'
          }
        },

        limit_total_requests_by_id: {
          type: 'RateLimit',
          config: {
            limit: 200,
            period: '1 hour',
          }
        },

        limit_total_requests_by_ip: {
          type: 'RateLimit',
          config: {
            limit: 200,
            period: '1 hour',
            groupBy: 'ip'
          }
        },

        limit_verify_code: {
          type: 'RateLimit',
          action: 'verifyCode',
          config: {
            limit: 20,
            period: '30 minutes'
          }
        },

        limit_unblock_login: {
          type: 'RateLimit',
          action: 'unblockLogin',
          config: {
            limit: 5,
            period: '15 minutes'
          }
        },

        limit_account_status: {
          type: 'RateLimit',
          action: 'checkAccountStatus',
          config: {
            limit: 5,
            period: '15 minutes'
          }
        },

        block_firehol_level1: {
          type: 'IPBlocklist',
          config: {
            filePath: '/path/to/firehol_level1.netset'
          },
          sanctions: {
            block: true
          }
        },

        suspect_firehol_webserver: {
          type: 'IPBlocklist',
          config: {
            filePath: '/path/to/firehol_webserver.netset'
          },
          sanctions: {
            suspect: true
          }
        },

        block_ips_with_bad_reputation: {
          type: 'ReputationCheck',
          config: {
            threshold: 80
          },
          sanctions: {
            block: true
          }
        },

        suspect_ips_with_bad_reputation: {
          type: 'ReputationCheck',
          config: {
            threshold: 50
          },
          sanctions: {
            suspect: true
          }
        },
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
