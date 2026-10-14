require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const seedAdmin = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/student_risk_db';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for seeding...');

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@university.edu';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';
    const adminName = process.env.ADMIN_NAME || 'System Administrator';

    // Check if an admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail.toLowerCase() });

    if (existingAdmin) {
      console.log(`Admin user already exists with email: ${adminEmail}`);
      process.exit(0);
    }

    // Create seed admin account
    const adminUser = await User.create({
      name: adminName,
      email: adminEmail.toLowerCase(),
      passwordHash: adminPassword, // Will be hashed by pre('save') hook
      role: 'admin',
      department: 'Administration',
      isActive: true
    });

    console.log('----------------------------------------------------');
    console.log('Initial Admin Account Successfully Created!');
    console.log(`Name:     ${adminUser.name}`);
    console.log(`Email:    ${adminUser.email}`);
    console.log(`Role:     ${adminUser.role}`);
    console.log('----------------------------------------------------');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin user:', error);
    process.exit(1);
  }
};

seedAdmin();
