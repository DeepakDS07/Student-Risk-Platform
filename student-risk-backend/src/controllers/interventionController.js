const Intervention = require('../models/Intervention');
const Student = require('../models/Student');

// @desc    Log a new intervention
// @route   POST /api/interventions
// @access  Mentor / Admin / Faculty
const createIntervention = async (req, res, next) => {
  try {
    const { studentId, action, notes, status } = req.body;

    if (!studentId || !action) {
      return res.status(400).json({
        success: false,
        message: 'studentId and action are required'
      });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const intervention = await Intervention.create({
      studentId,
      mentorId: req.user._id,
      action,
      notes: notes || '',
      status: status || 'open'
    });

    return res.status(201).json({
      success: true,
      data: intervention
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get interventions logged by a mentor
// @route   GET /api/interventions/mentor/:mentorId
// @access  Authenticated
const getMentorInterventions = async (req, res, next) => {
  try {
    const { mentorId } = req.params;
    const interventions = await Intervention.find({ mentorId })
      .populate({
        path: 'studentId',
        populate: { path: 'userId', select: 'name email' }
      })
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      data: interventions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get interventions for a specific student
// @route   GET /api/interventions/student/:studentId
// @access  Authenticated
const getStudentInterventions = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const interventions = await Intervention.find({ studentId })
      .populate('mentorId', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: interventions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update intervention status or notes
// @route   PUT /api/interventions/:id
// @access  Mentor / Admin / Faculty
const updateIntervention = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, status, notes } = req.body;

    const intervention = await Intervention.findById(id);
    if (!intervention) {
      return res.status(404).json({
        success: false,
        message: 'Intervention not found'
      });
    }

    if (action) intervention.action = action;
    if (status) intervention.status = status;
    if (notes !== undefined) intervention.notes = notes;

    await intervention.save();

    return res.status(200).json({
      success: true,
      data: intervention
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createIntervention,
  getMentorInterventions,
  getStudentInterventions,
  updateIntervention
};
