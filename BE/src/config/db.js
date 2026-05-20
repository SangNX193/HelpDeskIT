const mysql = require('mysql2/promise');

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
    charset: 'utf8mb4'
});

const query = async (sql, params = []) => {
    const [rows] = await pool.execute(sql, params);
    return rows;
};

const transaction = async (callback) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();
        const result = await callback(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const ping = async () => {
    const connection = await pool.getConnection();
    connection.release();
};

const close = () => pool.end();

module.exports = {
    pool,
    query,
    transaction,
    ping,
    close
};
