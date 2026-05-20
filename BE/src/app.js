require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const ticketRoutes = require('./routes/ticket.routes');
const notificationRoutes = require('./routes/notification.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const reportRoutes = require('./routes/report.routes');
const adminRoutes = require('./routes/admin.routes');
const supportRoutes = require('./routes/support.routes');
const catalogRoutes = require('./routes/catalog.routes');
const errorMiddleware = require('./middlewares/error.middleware');
const { notFound } = require('./utils/response');

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));
app.use(express.json({ limit: process.env.JSON_LIMIT || '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'API UTC IT Helpdesk đang chạy'
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api', supportRoutes);
app.use('/api', catalogRoutes);
app.use('/api', adminRoutes);

app.use((req, res) => notFound(res, 'Không tìm thấy đường dẫn API'));
app.use(errorMiddleware);

module.exports = app;
