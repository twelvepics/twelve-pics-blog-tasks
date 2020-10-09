const Queue = require('bull');
const mailQueue = new Queue('mail-queue', process.env.REDDIS_URL);
const nodemailer = require('nodemailer');

const arango_connection = require('./db/arangodb');
const setEmailSent = require('./db/sent-updates');

const logger = require('./logger');

logger.debug('#---- ENV ----#');
logger.debug(process.env.NODE_ENV);
logger.debug('#-------------#\n');

arango_connection.connect();

const mailConfig = {
  host: process.env.MAIL_SERVER,
  port: process.env.MAIL_PORT,
  auth: {
    user: process.env.MAIL_EMAIL,
    pass: process.env.MAIL_PASSWORD,
  },
};

const sendErrorEmail = async (error) => {
  let transporter = nodemailer.createTransport(mailConfig);
  const errorMessage = {
    from: process.env.MAIL_EMAIL,
    to: process.env.MAIL_EMAIL,
    subject: 'Twelvepics blog - Tasks Error',
    text: `Yo my man. A tasks error happened\n\n ${error.stack.toString()}`,
  };
  const response = await transporter.sendMail(errorMessage);
  return response;
}


const sendConfirmEmail = async (message) => {
  const transporter = nodemailer.createTransport(mailConfig);
  const response = await transporter.sendMail(message);
  return response;
};

const type2coll = {
  confirm: 'email_confirm',
};

mailQueue.process(4, async (job) => {
  try {
    logger.info(
      `Received message.  type: ${job.data.type} - key: ${job.data.key || "---"}`
    );
    const collection = type2coll[job.data.type];
    // if (collection) {
    //   logger.debug(`Collection to update: ${type2coll[job.data.type]}`);
    // }
    // SEND EMAIL
    await sendConfirmEmail(job.data.payload);
    // DB SENT EMAIL SENT

    const key = job.data.key;
    let sent;
    if (collection) {
      await setEmailSent(key, collection);
    }
    logger.info(`Sent email.  type: ${job.data.type} - key: ${job.data.key || "---"}`);
    // return sent;
    return true;
  } catch (e) {
    logger.error(e.stack.toString());
    sendErrorEmail(e);
  }
});

mailQueue.on('completed', (job) => {
  logger.info(`Job with id ${job.id} has been completed`);
});

mailQueue.on('failed', (job, err) => {
  // log it
  logger.error(`Job with id ${job.id} has failed`);
  if (err && err.stack) logger.error(err.stack.toString());
  sendErrorEmail(err);
});

setInterval(() => {
  mailQueue.count().then((res) => {
    logger.debug(`[count: ${res}]`);
  });
  mailQueue.getFailedCount().then((failed_count) => {
    // re-log this
    if (failed_count > 0) {
      const msg = `[getFailedCount: ${failed_count}]`;
      logger.error(msg);
      process.env.NODE_ENV === 'production' && sendErrorEmail(new Error(msg));

    }
  });
  mailQueue.getFailed().then((failedArray) => {
    failedArray.forEach((failedJob) => {
      const failureStr = `
                    [failedJob type : ${failedJob.data.type}/${failedJob.data.key} has failed]\n
                    [failedJob.failedReason: ${failedJob.failedReason}]\n
                    [failedJob.attemptsMade: ${failedJob.attemptsMade}]
                `;
      logger.error(failureStr);
      process.env.NODE_ENV === 'production' && sendErrorEmail(new Error(failureStr));
      failedJob.remove();
      // ?
      // failedJob.retry()
      //     .then(() => {
      //         // SCHEDULED FOR RETRY LOG ME
      //     });
    });
  });
}, 10000);

// logger not ready?
logger.info('Consumer started...');

////////////////////////////////////////////
// failed jon keys
////////////////////////////////////////////
// [
//     'opts',         'name',
//     'queue',        'data',
//     '_progress',    'delay',
//     'timestamp',    'stacktrace',
//     'returnvalue',  'attemptsMade',
//     'toKey',        'id',
//     'finishedOn',   'processedOn',
//     'failedReason'
//   ]
