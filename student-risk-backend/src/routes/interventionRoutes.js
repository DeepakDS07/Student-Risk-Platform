const express = require('express');
const router = express.Router();

const {
  createIntervention,
  getMentorInterventions,
  getStudentInterventions,
  updateIntervention
} = require('../controllers/interventionController');

const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.post(
  '/',
  authMiddleware,
  roleMiddleware('mentor', 'admin', 'faculty'),
  createIntervention
);

router.get(
  '/mentor/:mentorId',
  authMiddleware,
  getMentorInterventions
);

router.get(
  '/student/:studentId',
  authMiddleware,
  getStudentInterventions
);

router.put(
  '/:id',
  authMiddleware,
  roleMiddleware('mentor', 'admin', 'faculty'),
  updateIntervention
);

module.exports = router;
