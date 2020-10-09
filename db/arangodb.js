const arango = require("arangojs");
const Database = arango.Database;
const dbUrl = process.env.DB_URL

let _db = undefined;

//////////////////////////////////////////////////////////////
// TODO LOG CONNECTION ERROR AND EXIT
// NO WAY TO CONTINUE
//////////////////////////////////////////////////////////////
module.exports = {
    connect() {
        _db = new Database(dbUrl)
        // MAKE ENV VARS
        const db_user = process.env.DB_USER
        const db_password = process.env.DB_PASSWORD
        const db_name = process.env.DB_NAME
        const sysdb = new Database(dbUrl)
        sysdb.useBasicAuth(db_user, db_password);
        _db = sysdb.database(process.env.DB_NAME);
        console.log('Connected to DB');
    },
    getDb() {
        return _db;
    },
}
