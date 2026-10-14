const User = require('../models/User');
const Student = require('../models/Student');
const generateToken = require('../utils/generateToken');

// @desc    Admin creates a new account (any role)
// @route   POST /api/auth/create-user
// @access  Admin-only
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, department, rollNumber, batch, semester, assignedMentorId } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      passwordHash: password, // Mongoose pre-save hook will hash this
      role,
      department
    });

    // If student, create linked Student profile
    if (role === 'student') {
      const year = batch || String(new Date().getFullYear());
      const deptCode = (department && department.toLowerCase().includes('info')) ? 'IT' : 'CS';
      const finalRoll = rollNumber || `${deptCode}${year}${Math.floor(1000 + Math.random() * 9000)}`;

      await Student.create({
        userId: user._id,
        rollNumber: finalRoll,
        batch: String(year),
        semester: Number(semester) || 1,
        department: department || 'Computer Science',
        assignedMentorId: assignedMentorId || undefined
      });
    }

    return res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          ...(user.department && { department: user.department })
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user and select passwordHash explicitly
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = generateToken(user._id, user.role);

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          ...(user.department && { department: user.department })
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get logged in user profile
// @route   GET /api/auth/me
// @access  Authenticated
const getMe = async (req, res, next) => {
  try {
    const user = req.user;

    return res.status(200).json({
      success: true,
      data: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        ...(user.department && { department: user.department }),
        isActive: user.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user / clear client token
// @route   POST /api/auth/logout
// @access  Authenticated
const logout = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};

module.exports = {
  createUser,
  login,
  getMe,
  logout
};
