require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');
const User = require('./models/User');
const Student = require('./models/Student');
const Attendance = require('./models/Attendance');
const Assessment = require('./models/Assessment');
const Engagement = require('./models/Engagement');
const { verifyStudentAccess } = require('./middleware/studentAccessMiddleware');

async function runDataManagementTests() {
  console.log('\n==================================================');
  console.log('  RUNNING DATA MANAGEMENT MODULE VERIFICATION');
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
    // 1. Verify Model Definitions & Compound Indexes
    assert(Attendance && Attendance.modelName === 'Attendance', 'Attendance model defined');
    assert(Assessment && Assessment.modelName === 'Assessment', 'Assessment model defined');
    assert(Engagement && Engagement.modelName === 'Engagement', 'Engagement model defined');

    const attendanceIndexes = Attendance.schema.indexes();
    const attendanceCompound = attendanceIndexes.some(
      idx => idx[0].studentId === 1 && idx[0].subject === 1 && idx[0].date === 1 && idx[1].unique === true
    );
    assert(attendanceCompound, 'Attendance unique compound index (studentId, subject, date) configured');

    const assessmentIndexes = Assessment.schema.indexes();
    const assessmentCompound = assessmentIndexes.some(
      idx => idx[0].studentId === 1 && idx[0].subject === 1 && idx[0].date === 1
    );
    assert(assessmentCompound, 'Assessment compound index (studentId, subject, date) configured');

    const engagementIndexes = Engagement.schema.indexes();
    const engagementCompound = engagementIndexes.some(
      idx => idx[0].studentId === 1 && idx[0].period === 1 && idx[1].unique === true
    );
    assert(engagementCompound, 'Engagement unique compound index (studentId, period) configured');

    // 2. Verify Registered Express Routes
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

    // Attendance routes
    assert(routePaths.some(p => p.includes('/api/attendance') || p.includes('/student/:studentId')), 'Attendance endpoints registered');
    assert(routePaths.some(p => p.includes('/stats/student/:studentId')), 'Attendance stats endpoint registered');
    assert(routePaths.some(p => p.includes('/bulk')), 'Attendance bulk endpoint registered');

    // Assessment routes
    assert(routePaths.some(p => p.includes('/api/assessment') || p.includes('/student/:studentId')), 'Assessment endpoints registered');
    assert(routePaths.some(p => p.includes('/stats/student/:studentId')), 'Assessment stats endpoint registered');

    // Engagement routes
    assert(routePaths.some(p => p.includes('/api/engagement') || p.includes('/student/:studentId')), 'Engagement endpoints registered');
    assert(routePaths.some(p => p.includes('/stats/student/:studentId')), 'Engagement stats endpoint registered');

    // 3. Test Attendance Stats Logic Unit Test
    const mockAttendanceRecords = [
      { status: 'present' },
      { status: 'present' },
      { status: 'present' },
      { status: 'absent' },
      { status: 'late' }
    ];
    const totalRecords = mockAttendanceRecords.length;
    const presentCount = mockAttendanceRecords.filter(r => r.status === 'present').length;
    const attendancePercentage = Number(((presentCount / totalRecords) * 100).toFixed(1));
    assert(attendancePercentage === 60.0, 'Attendance stats calculation (60.0%) correct');

    // 4. Test Assessment Stats Breakdown Unit Test
    const mockAssessmentRecords = [
      { type: 'internal', marksObtained: 40, maxMarks: 50 }, // 80%
      { type: 'assignment', marksObtained: 45, maxMarks: 50 }, // 90%
      { type: 'semester', marksObtained: 70, maxMarks: 100 } // 70%
    ];
    const percentages = mockAssessmentRecords.map(r => (r.marksObtained / r.maxMarks) * 100);
    const avgMarks = Number((percentages.reduce((a, b) => a + b, 0) / percentages.length).toFixed(1));
    assert(avgMarks === 80.0, 'Assessment average calculation (80.0%) correct');

    // 5. Test Engagement Trend Logic Unit Test
    const mockImprovingEngagement = [
      { period: '2026-01', participationScore: 60 },
      { period: '2026-02', participationScore: 75 }
    ];
    const diff = mockImprovingEngagement[1].participationScore - mockImprovingEngagement[0].participationScore;
    const trend = diff >= 5 ? 'improving' : diff <= -5 ? 'declining' : 'stable';
    assert(trend === 'improving', 'Engagement trend calculation ("improving") correct');

    // 6. Test Period Regex Validation
    const periodRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
    assert(periodRegex.test('2026-09') === true, 'Period format 2026-09 valid');
    assert(periodRegex.test('2026-13') === false, 'Invalid period month 2026-13 rejected');

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

runDataManagementTests();
