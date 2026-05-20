const reportService = require('../services/report.service');
const { success, asyncHandler } = require('../utils/response');

const getTicketReport = asyncHandler(async (req, res) => {
    const data = await reportService.getTicketReport(req.query, req.user);
    return success(res, data);
});

const getSlaReport = asyncHandler(async (req, res) => {
    const data = await reportService.getSlaReport(req.query, req.user);
    return success(res, data);
});

const getFeedbackReport = asyncHandler(async (req, res) => {
    const data = await reportService.getFeedbackReport(req.query, req.user);
    return success(res, data);
});

const getSupportPerformanceReport = asyncHandler(async (req, res) => {
    const data = await reportService.getSupportPerformanceReport(req.query, req.user);
    return success(res, data);
});

module.exports = {
    getTicketReport,
    getSlaReport,
    getFeedbackReport,
    getSupportPerformanceReport
};
