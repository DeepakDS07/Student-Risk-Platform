require('dotenv').config();
const bcrypt = require('bcryptjs');
const app = require('./app');
const User = require('./models/User');
const Student = require('./models/Student');
const Attendance = require('./models/Attendance');
const Assessment = require('./models/Assessment');
const Engagement = require('./models/Engagement');
const RiskScore = require('./models/RiskScore');
const Intervention = require('./models/Intervention');

async function runVerificationTests() {
  console.log('\n==================================================');
  console.log('  RUNNING BACKEND SCHEMA & AUTH SPEC VERIFICATION');
  console.log('==================================================\n');

  let passes = 0;
  let failures = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`✅ PASSED: ${testName}`);
      passes++;
    } else {
      console.error(`❌ FAILED: ${testName}`);
      failures++;
    }
  }

  try {
    // 1. Verify Model Definitions & Schemas
    assert(User && User.modelName === 'User', 'User model defined');
    assert(Student && Student.modelName === 'Student', 'Student model defined');
    assert(Attendance && Attendance.modelName === 'Attendance', 'Attendance model defined');
    assert(Assessment && Assessment.modelName === 'Assessment', 'Assessment model defined');
    assert(Engagement && Engagement.modelName === 'Engagement', 'Engagement model defined');
    assert(RiskScore && RiskScore.modelName === 'RiskScore', 'RiskScore model defined');
    assert(Intervention && Intervention.modelName === 'Intervention', 'Intervention model defined');

    // 2. Verify Schema Indexes
    const userEmailIndex = User.schema.indexes().some(idx => idx[0].email === 1) || User.schema.paths.email.options.unique;
    assert(Boolean(userEmailIndex), 'User email unique index configured');

    const attendanceIndexes = Attendance.schema.indexes();
    const attendanceCompound = attendanceIndexes.some(
      idx => idx[0].studentId === 1 && idx[0].subject === 1 && idx[0].date === 1
    );
    assert(attendanceCompound, 'Attendance compound index (studentId, subject, date) configured');

    const riskIndexes = RiskScore.schema.indexes();
    const riskCompound = riskIndexes.some(
      idx => idx[0].studentId === 1 && idx[0].subject === 1 && idx[0].computedAt === -1
    );
    assert(riskCompound, 'RiskScore compound index (studentId, subject, computedAt: -1) configured');

    // 3. Test Password Hashing and Comparison Methods
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('SecretPassword123', salt);

    const testUser = new User({
      name: 'Test Admin',
      email: 'testadmin@example.com',
      passwordHash: hashedPassword,
      role: 'admin'
    });

    assert(testUser.passwordHash !== 'SecretPassword123', 'Password hash stored in passwordHash field');

    const isMatch = await testUser.comparePassword('SecretPassword123');
    assert(isMatch === true, 'comparePassword() returns true for correct password');

    const isWrongMatch = await testUser.comparePassword('WrongPassword');
    assert(isWrongMatch === false, 'comparePassword() returns false for incorrect password');

    const jsonObj = testUser.toJSON();
    assert(jsonObj.passwordHash === undefined, 'passwordHash excluded from toJSON() output');

    // 4. Verify Route Endpoints Structure
    const routes = [];
    app._router.stack.forEach((middleware) => {
      if (middleware.route) {
        routes.push(middleware.route);
      } else if (middleware.name === 'router') {
        middleware.handle.stack.forEach((handler) => {
          if (handler.route) routes.push(handler.route);
        });
      }
    });

    const routePaths = routes.map(r => `${Object.keys(r.methods).join(',').toUpperCase()} ${r.path}`);
    assert(routePaths.some(p => p.includes('/create-user')), 'POST /create-user route registered');
    assert(routePaths.some(p => p.includes('/login')), 'POST /login route registered');
    assert(routePaths.some(p => p.includes('/me')), 'GET /me route registered');
    assert(routePaths.some(p => p.includes('/logout')), 'POST /logout route registered');

  } catch (err) {
    console.error('Test execution exception:', err);
    failures++;
  }

  console.log('\n--------------------------------------------------');
  console.log(`SUMMARY: ${passes} Passed | ${failures} Failed`);
  console.log('--------------------------------------------------\n');

  if (failures > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runVerificationTests();
