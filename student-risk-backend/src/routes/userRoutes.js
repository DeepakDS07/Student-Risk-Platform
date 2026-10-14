const express = require('express');
const router = express.Router();

const {
  getUsers,
  getStudentsList,
  toggleUserStatus,
  updateStudentMentor
} = require('../controllers/userController');

const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.get('/', authMiddleware, getUsers);
router.get('/students', authMiddleware, getStudentsList);
router.put('/:id/status', authMiddleware, roleMiddleware('admin'), toggleUserStatus);
router.put('/students/:id/mentor', authMiddleware, roleMiddleware('admin', 'faculty'), updateStudentMentor);

module.exports = router;
