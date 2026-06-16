const mysql = require('mysql2/promise');

const normalizeDbTimeZone = (value) => {
    const text = String(value || '+07:00').trim();
    return /^[+-]\d{2}:\d{2}$/.test(text) ? text : '+07:00';
};

const DB_TIMEZONE = normalizeDbTimeZone(process.env.DB_TIMEZONE);

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'utc_helpdesk',
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
    queueLimit: 0,
    namedPlaceholders: true,
    decimalNumbers: true,
    charset: 'utf8mb4',
    timezone: DB_TIMEZONE
});

const prepareConnection = async (connection) => {
    await connection.query('SET time_zone = ?', [DB_TIMEZONE]);
};

const query = async (sql, params = []) => {
    const connection = await pool.getConnection();

    try {
        await prepareConnection(connection);
        const [rows] = await connection.execute(sql, params);
        return rows;
    } finally {
        connection.release();
    }
};

const transaction = async (callback) => {
    const connection = await pool.getConnection();
    let transactionStarted = false;

    try {
        await prepareConnection(connection);
        await connection.beginTransaction();
        transactionStarted = true;
        const result = await callback(connection);
        await connection.commit();
        return result;
    } catch (error) {
        if (transactionStarted) {
            await connection.rollback();
        }
        throw error;
    } finally {
        connection.release();
    }
};

const ping = async () => {
    const connection = await pool.getConnection();
    try {
        await prepareConnection(connection);
    } finally {
        connection.release();
    }
};

const close = () => pool.end();

module.exports = {
    DB_TIMEZONE,
    pool,
    query,
    transaction,
    ping,
    close
};
