const express = require('express');
const defectsRepository = require('../data/defectsRepository');
const { getDashboardSummary } = require('../services/dashboardService');

const router = express.Router();

router.get('/summary', (req, res) => {
  const defects = defectsRepository.findAll();
  const summary = getDashboardSummary(req.user, defects);
  res.json(summary);
});

module.exports = router;
