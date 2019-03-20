/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Listens for events from the DataFlow fraud detection pipeline.
 *
 * Events currently are only logged to ensure the PubSub subscription
 * is connected and events are being received as expected.
 *
 * Next steps are:
 * 1. Log discrepancies between events DataFlow sends and whether we think
 *    think the same action should be taken, e.g., if DataFlow says an
 *    IP address should be blocked, then block it.
 * 2. Once the discrepancy volume is sufficiently low, start to
 *    act on DataFlow events.
 * 3. Once we build confidence in the DataFlow events, remove duplicate
 *    rules from the content server and rely upon DataFlow.
 */

module.exports = function (config, log, fetchRecords) {
  if (! config.dataflow.enabled) {
    // no-op if not enabled
    return
  }

  const {
    projectId,
    subscriptionName
  } = config.dataflow.gcpPubSub

  if (! projectId) {
    throw new Error('Missing configuration option, `dataflow.gcpPubSub.projectId`')
  }

  if (! subscriptionName) {
    throw new Error('Missing configuration option, `dataflow.gcpPubSub.subscriptionName`')
  }

  const { PubSub } = require('@google-cloud/pubsub')
  const pubsub = new PubSub({ projectId })

  const subscription = pubsub.subscription(subscriptionName)

  let messageCount = 0
  const logMessage = message => {
    log.info({
      op: 'fxa.customs.dataflow.message',
      count: messageCount,
      id: message.id,
      // message.data is a Buffer, convert to a string
      data: message.data.toString(),
      attributes: message.attributes
    })

    messageCount++
  }

  const messageHandler = message => {
    logMessage(message)

    let metadata

    try {
      metadata = parseMessage(message)
    } catch (err) {
      log.error({
        op: 'dataflow.message.invalid',
        reason: err.message
      })
    }

    if (metadata) {
      checkForUnexpectedRateLimit(metadata)
    }

    message.ack()
  }

  subscription.on('message', messageHandler)

  const logError = error => {
    // logs errors but does not cause the server
    // to shut down.
    log.error({
      op: 'fxa.customs.dataflow.error',
      error: String(error)
    })
  }

  subscription.on('error', logError)

  function logUnexpectedRateLimit(category) {
    log.info({
      op: 'dataflow.unexpected_block',
      customs_category: category
    })
  }

  async function checkForUnexpectedRateLimit(metadata) {
    const {
      customs_category: category,
      accountid: email,
      sourceaddress: ip,
      uid
    } = metadata

    if (! category) {
      log.error({
        op: 'dataflow.customs_category.missing'
      })
      return
    }

    const {
      ipRecord,
      emailRecord,
      ipEmailRecord,
      uidRecord,
     } = await fetchRecords({ ip, email, uid })

    switch (category) {
    case 'rl_login_failure_sourceaddress_accountid':
      if (! (ipEmailRecord && ipEmailRecord.shouldBlock())) {
        logUnexpectedRateLimit(category)
      }
      break
    case 'rl_sms_sourceaddress':
      if (! (ipRecord && ipRecord.shouldBlock())) {
        logUnexpectedRateLimit(category)
      }
      break
    case 'rl_sms_accountid':
      if (! (emailRecord && emailRecord.shouldBlock())) {
        logUnexpectedRateLimit(category)
      }
      break
    case 'rl_email_recipient':
      if (! (emailRecord && emailRecord.shouldBlock())) {
        logUnexpectedRateLimit(category)
      }
      break
    case 'rl_statuscheck':
      if (! (ipRecord && ipRecord.shouldBlock())) {
        logUnexpectedRateLimit(category)
      }
      break
    case 'rl_verifycode_sourceaddress_accountid':
      if (! (uidRecord && uidRecord.isRateLimited())) {
        logUnexpectedRateLimit(category)
      }
      break
    default:
      log.error({
        op: 'dataflow.customs_category.unknown',
        customs_category: category
      })
    }
  }
}

function parseMessage (message) {
  if (! message || ! message.data) {
    throw new Error('parse error')
  }
  // message.data is a Buffer
  const body = message.data.toString()
  const parsedBody = JSON.parse(body)

  if (! parsedBody.metadata) {
    throw new Error('metadata missing')
  }

  if (! parsedBody.metadata.forEach) {
    throw new Error('invalid metadata')
  }

  const metadata = {}

  parsedBody.metadata.forEach(entry => {
    metadata[entry.key] = entry.value
  })

  return metadata
}
