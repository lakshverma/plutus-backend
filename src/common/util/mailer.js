const { Resend } = require('resend');
const logger = require('./logger');
const { RESEND_CONFIG, MAIL_DRY_RUN } = require('./config');

// One client for the process rather than one per message.
const resend = new Resend(RESEND_CONFIG.apiKey);

// Sends one message, returning Resend's `{ data, error }` shape so callers handle
// failure the same way whether or not the message was actually transmitted.
//
// With MAIL_DRY_RUN the message is logged and nothing leaves the process. That is the
// safety catch for development: no combination of a mistyped recipient and a
// production API key can deliver real mail.
const sendEmail = async (message) => {
  if (MAIL_DRY_RUN) {
    logger.info(
      `MAIL_DRY_RUN: not sending mail. ${JSON.stringify({
        to: message.to,
        subject: message.subject,
        template: message.template && message.template.id,
        variables: message.template && message.template.variables,
      })}`,
    );
    return { data: { id: 'dry-run' }, error: null };
  }

  return resend.emails.send(message);
};

module.exports = { sendEmail };
