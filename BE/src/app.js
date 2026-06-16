require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/auth.routes');
const ticketRoutes = require('./routes/ticket.routes');
const notificationRoutes = require('./routes/notification.routes');
const consultationRoutes = require('./routes/consultation.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const reportRoutes = require('./routes/report.routes');
const adminRoutes = require('./routes/admin.routes');
const supportRoutes = require('./routes/support.routes');
const catalogRoutes = require('./routes/catalog.routes');
const errorMiddleware = require('./middlewares/error.middleware');
const { getUploadDir } = require('./config/upload');
const { notFound } = require('./utils/response');

const app = express();

const trustProxy = String(process.env.TRUST_PROXY || '').trim();
if (trustProxy && !['0', 'false'].includes(trustProxy.toLowerCase())) {
    app.set('trust proxy', trustProxy.toLowerCase() === 'true' ? 1 : Number(trustProxy) || 1);
}

const configuredOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5000,http://127.0.0.1:5000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
if (process.env.NODE_ENV !== 'production') {
    for (const localOrigin of ['http://localhost:5000', 'http://127.0.0.1:5000']) {
        if (!configuredOrigins.includes(localOrigin)) {
            configuredOrigins.push(localOrigin);
        }
    }
}
const allowAnyOrigin = configuredOrigins.includes('*');

app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'same-origin');
    return next();
});
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowAnyOrigin || configuredOrigins.includes(origin)) {
            return callback(null, allowAnyOrigin ? true : origin);
        }

        return callback(new Error('CORS origin is not allowed'));
    },
    credentials: true
}));
app.use(express.json({ limit: process.env.JSON_LIMIT || '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use('/uploads', express.static(getUploadDir(), {
    dotfiles: 'deny',
    index: false,
    fallthrough: false,
    setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
    }
}));

app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'API UTC IT Helpdesk đang chạy'
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api', supportRoutes);
app.use('/api', catalogRoutes);
app.use('/api', adminRoutes);

app.use((req, res) => notFound(res, 'Không tìm thấy đường dẫn API'));
app.use(errorMiddleware);

module.exports = app;
