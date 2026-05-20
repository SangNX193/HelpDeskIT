const dashboardService = require('../services/dashboard.service');
const { success, asyncHandler } = require('../utils/response');

const getOverview = asyncHandler(async (req, res) => success(res, await dashboardService.getOverview()));
const getSlaStatistics = asyncHandler(async (req, res) => success(res, await dashboardService.getSlaStatistics()));
const getSupportPerformance = asyncHandler(async (req, res) => success(res, await dashboardService.getSupportPerformance()));
const getTicketsByStatus = asyncHandler(async (req, res) => success(res, await dashboardService.getTicketsByStatus()));
const getTicketsByPriority = asyncHandler(async (req, res) => success(res, await dashboardService.getTicketsByPriority()));
const getTicketsByService = asyncHandler(async (req, res) => success(res, await dashboardService.getTicketsByService()));

module.exports = {
    getOverview,
    getSlaStatistics,
    getSupportPerformance,
    getTicketsByStatus,
    getTicketsByPriority,
    getTicketsByService
};
