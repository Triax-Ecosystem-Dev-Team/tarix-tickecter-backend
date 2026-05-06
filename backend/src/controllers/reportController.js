const prisma = require('../config/db');
const { getRevenueAnalytics } = require('./analyticsController');

exports.getReportData = async (req, res) => {
  // Delegate to existing analytics logic which already aggregates exactly what is needed
  return getRevenueAnalytics(req, res);
};

exports.createSchedule = async (req, res) => {
  try {
    const { reportType, frequency, time, recipients, format } = req.body;
    
    const newSchedule = await prisma.reportSchedule.create({
      data: {
        reportType,
        frequency,
        time,
        recipients,
        status: 'Active'
      }
    });

    res.status(201).json({ success: true, data: newSchedule });
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({ success: false, message: 'Failed to create schedule' });
  }
};

exports.getSchedules = async (req, res) => {
  try {
    const schedules = await prisma.reportSchedule.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({ success: true, data: schedules });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch schedules' });
  }
};

exports.logReportGeneration = async (req, res) => {
  try {
    const { reportType, format, size } = req.body;

    const newHistory = await prisma.reportHistory.create({
      data: {
        name: `${reportType} Report`,
        type: reportType.split(' ')[0],
        format,
        size: size || 'Unknown Size',
        status: 'Ready'
      }
    });

    res.status(201).json({ success: true, data: newHistory });
  } catch (error) {
    console.error('Error logging report generation:', error);
    res.status(500).json({ success: false, message: 'Failed to log report' });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const history = await prisma.reportHistory.findMany({
      orderBy: { generatedAt: 'desc' },
      take: 50 // Limit to latest 50 to prevent huge payloads
    });
    res.status(200).json({ success: true, data: history });
  } catch (error) {
    console.error('Error fetching report history:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch report history' });
  }
};
