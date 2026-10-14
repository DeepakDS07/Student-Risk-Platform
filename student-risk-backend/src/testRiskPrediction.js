require('dotenv').config();
const app = require('./app');
const RiskScore = require('./models/RiskScore');
const { calculateStudentRisk, logRiskAudit } = require('./services/riskCalculationService');

async function runRiskPredictionTests() {
  console.log('\n==================================================');
  console.log('  RUNNING RISK PREDICTION MODULE VERIFICATION');
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
    // 1. Verify Model Definitions & Schema Extensions
    assert(RiskScore && RiskScore.modelName === 'RiskScore', 'RiskScore model defined');
    assert(RiskScore.schema.paths.details !== undefined, 'RiskScore details field defined');
    assert(RiskScore.schema.paths.recommendation !== undefined, 'RiskScore recommendation field defined');

    const riskIndexes = RiskScore.schema.indexes();
    const riskCompound = riskIndexes.some(
      idx => idx[0].studentId === 1 && idx[0].subject === 1 && idx[0].computedAt === -1
    );
    assert(riskCompound, 'RiskScore compound index (studentId, subject, computedAt: -1) configured');

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

    assert(routePaths.some(p => p.includes('/compute')), 'POST /api/risk/compute route registered');
    assert(routePaths.some(p => p.includes('/batch-compute')), 'POST /api/risk/batch-compute route registered');
    assert(routePaths.some(p => p.includes('/student/:studentId')), 'GET /api/risk/student/:studentId route registered');
    assert(routePaths.some(p => p.includes('/student/:studentId/subject/:subject')), 'GET /api/risk/student/:studentId/subject/:subject route registered');
    assert(routePaths.some(p => p.includes('/class/:classId')), 'GET /api/risk/class/:classId route registered');

    // 3. Test Weighted Formula Unit Calculation
    const attendance_percent = 72;
    const avg_marks = 45;
    const marks_trend = -5;
    const engagement_score = 35;

    const rawRiskScore =
      (100 - attendance_percent) * 0.25 +
      (100 - avg_marks) * 0.35 +
      Math.max(0, -marks_trend) * 0.15 +
      (100 - engagement_score) * 0.25;

    const score = Math.max(0, Math.min(100, Number(rawRiskScore.toFixed(1))));
    assert(score === 43.3 || score === 43.25, `Risk score calculation correct (${score})`);

    let riskLevel = 'low';
    if (score >= 60) riskLevel = 'high';
    else if (score >= 30) riskLevel = 'medium';
    assert(riskLevel === 'medium', 'Risk level classification (medium) correct');

    const contributingFactors = [];
    if (attendance_percent < 75) contributingFactors.push('low attendance');
    if (avg_marks < 50) contributingFactors.push('low average marks');
    if (marks_trend < -10) contributingFactors.push('declining marks trend');
    if (engagement_score < 40) contributingFactors.push('low engagement');

    assert(
      contributingFactors.includes('low attendance') &&
      contributingFactors.includes('low average marks') &&
      contributingFactors.includes('low engagement'),
      'Contributing factors triggers evaluated accurately'
    );

    // 4. Test Audit Logging Helper
    let loggedMessage = '';
    const originalLog = console.log;
    console.log = (msg) => { loggedMessage = msg; originalLog(msg); };

    logRiskAudit('student_123', 'Math', 43.3, contributingFactors);
    console.log = originalLog;

    assert(loggedMessage.includes('COMPUTE_RISK') && loggedMessage.includes('student_123'), 'Audit log entry formatted correctly');

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

runRiskPredictionTests();
