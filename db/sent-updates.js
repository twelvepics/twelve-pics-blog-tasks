const arango = require("arangojs");
const arango_connection = require('./arangodb')

/*
* collection email_confirm
* set sent to true
*/
const setEmailSent = async (key, collection) => {
    const db = arango_connection.getDb();
    const _collection = db.collection(collection);
    const date_sent = new Date();
    return await _collection.update(key, { sent: true, date_sent });
}
module.exports = setEmailSent;