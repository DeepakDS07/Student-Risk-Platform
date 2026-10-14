const Attendance = require('../models/Attendance');
const Assessment = require('../models/Assessment');
const Engagement = require('../models/Engagement');
const RiskScore = require('../models/RiskScore');
const Student = require('../models/Student');

/**
 * Audit Logger Helper
 */
const logRiskAudit = (studentId, subject, score, triggers) => {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const triggerStr = triggers.map(t => `"${t}"`).join(', ');
  console.log(`${timestamp} | COMPUTE_RISK | studentId: ${studentId} | subject: ${subject} | score: ${score} | triggers: [${triggerStr}]`);
};

/**
 * Computes risk score for a single student and subject
 */
const calculateStudentRisk = async (studentId, subject) => {
  // 1. Fetch data signals
  const attendanceRecords = await Attendance.find({ studentId, subject });
  const assessmentRecords = await Assessment.find({ studentId, subject }).sort({ date: 1 });
  const engagementRecord = await Engagement.findOne({ studentId }).sort({ period: -1 });

  const totalDataCount = attendanceRecords.length + assessmentRecords.length;
  if (totalDataCount < 3) {
    const error = new Error(
      'Not enough data to compute risk for this student/subject. At least 3 attendance or assessment records required.'
    );
    error.statusCode = 404;
    throw error;
  }

  // 2. Compute attendance_percent
  let attendance_percent = 100;
  if (attendanceRecords.length > 0) {
    const presentOrLate = attendanceRecords.filter(r => r.status === 'present' || r.status === 'late').length;
    attendance_percent = Number(((presentOrLate / attendanceRecords.length) * 100).toFixed(1));
  }

  // 3. Compute avg_marks & marks_trend
  let avg_marks = 100;
  let marks_trend = 0;
  if (assessmentRecords.length > 0) {
    const percentages = assessmentRecords.map(r => (r.marksObtained / r.maxMarks) * 100);
    avg_marks = Number((percentages.reduce((a, b) => a + b, 0) / percentages.length).toFixed(1));

    if (percentages.length >= 6) {
      const latest3 = percentages.slice(-3);
      const oldest3 = percentages.slice(0, 3);
      const latestAvg = latest3.reduce((a, b) => a + b, 0) / 3;
      const oldestAvg = oldest3.reduce((a, b) => a + b, 0) / 3;
      marks_trend = Number((latestAvg - oldestAvg).toFixed(1));
    } else if (percentages.length >= 2) {
      const mid = Math.floor(percentages.length / 2);
      const oldestHalf = percentages.slice(0, mid);
      const latestHalf = percentages.slice(mid);
      const oldestAvg = oldestHalf.reduce((a, b) => a + b, 0) / oldestHalf.length;
      const latestAvg = latestHalf.reduce((a, b) => a + b, 0) / latestHalf.length;
      marks_trend = Number((latestAvg - oldestAvg).toFixed(1));
    }
  }

  // 4. Compute engagement_score
  let engagement_score = 50; // default baseline if no LMS data
  if (engagementRecord) {
    const loginCount = engagementRecord.loginCount || 0;
    const participationScore = engagementRecord.participationScore || 0;
    const loginScore = Math.min(100, (loginCount / 20) * 100);
    engagement_score = Number(((loginScore * 0.5) + (participationScore * 0.5)).toFixed(1));
  }

  // 5. Apply Weighted Formula
  const rawRiskScore =
    (100 - attendance_percent) * 0.25 +
    (100 - avg_marks) * 0.35 +
    Math.max(0, -marks_trend) * 0.15 +
    (100 - engagement_score) * 0.25;

  const score = Math.max(0, Math.min(100, Number(rawRiskScore.toFixed(1))));

  // 6. Risk Level Classification & Factors
  let riskLevel = 'low';
  if (score >= 60) {
    riskLevel = 'high';
  } else if (score >= 30) {
    riskLevel = 'medium';
  }

  const contributingFactors = [];
  if (attendance_percent < 75) contributingFactors.push('low attendance');
  if (avg_marks < 50) contributingFactors.push('low average marks');
  if (marks_trend < -10) contributingFactors.push('declining marks trend');
  if (engagement_score < 40) contributingFactors.push('low engagement');

  // 7. Generate Actionable Recommendation
  let recommendation = 'Student is performing well. Maintain current academic momentum.';
  if (riskLevel === 'high') {
    if (contributingFactors.includes('low attendance') && contributingFactors.includes('low average marks')) {
      recommendation = 'Schedule immediate intervention. Attendance and marks both critically low.';
    } else if (contributingFactors.includes('low average marks')) {
      recommendation = 'Provide academic tutoring and supplementary learning resources.';
    } else if (contributingFactors.includes('low attendance')) {
      recommendation = 'Conduct counseling session regarding attendance requirements.';
    } else {
      recommendation = 'Urgent faculty/mentor review recommended due to high overall risk.';
    }
  } else if (riskLevel === 'medium') {
    if (contributingFactors.length > 0) {
      recommendation = `Monitor progress closely. Address early warning signs: ${contributingFactors.join(', ')}.`;
    } else {
      recommendation = 'Monitor progress closely for potential performance drops.';
    }
  }

  // 8. Log Audit Entry
  logRiskAudit(studentId, subject, score, contributingFactors);

  // 9. Save or update RiskScore document
  const riskDoc = await RiskScore.create({
    studentId,
    subject,
    score,
    riskLevel,
    contributingFactors,
    details: {
      attendance_percent,
      avg_marks,
      marks_trend,
      engagement_score,
      rawMetrics: {
        attendanceRecords: attendanceRecords.length,
        presentCount: attendanceRecords.filter(r => r.status === 'present').length,
        assessmentCount: assessmentRecords.length,
        latestMarks: assessmentRecords.slice(-3).map(a => a.marksObtained)
      }
    },
    recommendation,
    computedAt: new Date()
  });

  return riskDoc;
};

module.exports = {
  calculateStudentRisk,
  logRiskAudit
};
