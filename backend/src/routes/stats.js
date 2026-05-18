const express = require('express');
const Project = require('../models/Project');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', async (_req, res) => {
  try {
    const [
      total,
      byStatus,
      byRisk,
      recentIncidents,
      topTechStack,
    ] = await Promise.all([
      Project.countDocuments(),
      Project.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Project.aggregate([{ $group: { _id: '$riskLevel', count: { $sum: 1 } } }]),
      Project.aggregate([
        { $unwind: '$incidents' },
        { $sort: { 'incidents.date': -1 } },
        { $limit: 5 },
        {
          $project: {
            name: 1,
            incident: '$incidents',
          },
        },
      ]),
      Project.aggregate([
        { $unwind: '$techStack' },
        { $group: { _id: '$techStack', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    const statusMap = {};
    byStatus.forEach((s) => (statusMap[s._id] = s.count));

    const riskMap = {};
    byRisk.forEach((r) => (riskMap[r._id] = r.count));

    res.json({
      total,
      active: statusMap['active'] || 0,
      planning: statusMap['planning'] || 0,
      completed: statusMap['completed'] || 0,
      failed: statusMap['failed'] || 0,
      onHold: statusMap['on-hold'] || 0,
      highRisk: (riskMap['high'] || 0) + (riskMap['critical'] || 0),
      byStatus: byStatus.map((s) => ({ name: s._id, value: s.count })),
      byRisk: byRisk.map((r) => ({ name: r._id, value: r.count })),
      recentIncidents,
      topTechStack: topTechStack.map((t) => ({ name: t._id, count: t.count })),
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
