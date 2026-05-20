require('dotenv').config();

const app = require('./app');
const db = require('./config/db');

const PORT = Number(process.env.PORT) || 3000;

const server = app.listen(PORT, async () => {
    console.log(`UTC IT Helpdesk API listening on port ${PORT}`);

    try {
        await db.ping();
        console.log('Database connection ready');
    } catch (error) {
        console.warn(`Database connection failed: ${error.message}`);
    }
});

const shutdown = async (signal) => {
    console.log(`${signal} received. Shutting down...`);
    server.close(async () => {
        await db.close();
        process.exit(0);
    });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
