const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf } = format;
const Transport = require('winston-transport');
const arango_connection = require('./db/arangodb')

const level = process.env.LOG_LEVEL || 'debug';

/*
* if dev => log to console
* if prod log to logs_tasks
*/


class LogToDBTransport extends Transport {
    constructor(opts) {
        super(opts);
    }
    async log(info, callback) {
        setImmediate(() => {
            this.emit('logged', info);
        });
        // Perform the writing to the remote service
        const db = arango_connection.getDb()
        const collection = db.collection('logs_tasks');
        await collection.save({
            level: info.level,
            timestamp: info.timestamp,
            message: info.message.split('\n').map(l => l.trim())
        });
        // -- 
        callback();
    }
};

const myFormat = printf(({ level, message, timestamp }) => {
    return `${level}: ${message} - ${timestamp} `;
});

const logger = createLogger({
    format: combine(
        timestamp(),
        myFormat
    ),
    transports: []
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new transports.Console({ level }));
} else {
    logger.add(new LogToDBTransport({}));
}
module.exports = logger;