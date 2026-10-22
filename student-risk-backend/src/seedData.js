/**
 * seedData.js — Comprehensive seed script for Student Risk Prediction Platform
 * 
 * Creates:
 *   - 1 Admin (already exists from seedAdmin, skipped if duplicate)
 *   - 2 Faculty users
 *   - 1 Mentor user
 *   - 3 Student users + Student profiles
 *   - Attendance records (past 30 days, 2 subjects)
 *   - Assessment records (internal + assignment + semester)
 *   - Engagement records (past 3 months)
 *   - Risk scores (computed via the risk service)
 *
 * Run: node src/seedData.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const connectDB  = require('./config/db');
const User       = require('./models/User');
const Student    = require('./models/Student');
const Attendance = require('./models/Attendance');
const Assessment = require('./models/Assessment');
const Engagement = require('./models/Engagement');
const RiskScore  = require('./models/RiskScore');
const { calculateStudentRisk } = require('./services/riskCalculationService');

// ─── helpers ────────────────────────────────────────────────────────────────

const hash = (pwd) => bcrypt.hash(pwd, 10);

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(8, 0, 0, 0);
  return d;
}

function monthPeriod(monthsAgo) {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ─── seed definitions ────────────────────────────────────────────────────────

const SUBJECTS = ['Mathematics', 'Data Structures'];

const USERS_SEED = [
  {
    name: 'System Administrator',
    email: 'admin@university.edu',
    password: 'Admin@123456',
    role: 'admin',
    department: 'Administration'
  },
  {
    name: 'Dr. Priya Sharma',
    email: 'faculty1@university.edu',
    password: 'Faculty@123456',
    role: 'faculty',
    department: 'Computer Science'
  },
  {
    name: 'Prof. Rahul Verma',
    email: 'faculty2@university.edu',
    password: 'Faculty@123456',
    role: 'faculty',
    department: 'Computer Science'
  },
  {
    name: 'Ms. Anita Nair',
    email: 'mentor@university.edu',
    password: 'Mentor@123456',
    role: 'mentor',
    department: 'Computer Science'
  },
  // Students — low risk (good performance)
  {
    name: 'Arjun Mehta',
    email: 'student1@university.edu',
    password: 'Student@123456',
    role: 'student',
    department: 'Computer Science',
    studentProfile: {
      rollNumber: 'CS2024001',
      batch: '2024',
      semester: 3,
      program: 'B.Tech Computer Science'
    },
    // attendance: 90%, marks: 85%, engagement: high → LOW risk
    attendanceProfile: { presentDays: 27, lateDays: 0, absentDays: 3 },
    marksProfile: [
      { type: 'ut1', marks: 23, max: 25 },
      { type: 'ut2', marks: 24, max: 25 },
      { type: 'cat1', marks: 45, max: 50 },
      { type: 'cat2', marks: 44, max: 50 },
      { type: 'semester', marks: 86, max: 100 }
    ],
    engagementProfile: [
      { monthsAgo: 2, logins: 28, delay: 1.2, participation: 80 },
      { monthsAgo: 1, logins: 30, delay: 0.8, participation: 85 },
      { monthsAgo: 0, logins: 25, delay: 1.0, participation: 82 }
    ]
  },
  // Students — medium risk (borderline)
  {
    name: 'Sneha Patel',
    email: 'student2@university.edu',
    password: 'Student@123456',
    role: 'student',
    department: 'Computer Science',
    studentProfile: {
      rollNumber: 'CS2024002',
      batch: '2024',
      semester: 3,
      program: 'B.Tech Computer Science'
    },
    // attendance: 70%, marks: 60%, engagement: moderate → MEDIUM risk
    attendanceProfile: { presentDays: 21, lateDays: 0, absentDays: 9 },
    marksProfile: [
      { type: 'ut1', marks: 16, max: 25 },
      { type: 'ut2', marks: 15, max: 25 },
      { type: 'cat1', marks: 31, max: 50 },
      { type: 'cat2', marks: 29, max: 50 },
      { type: 'semester', marks: 58, max: 100 }
    ],
    engagementProfile: [
      { monthsAgo: 2, logins: 14, delay: 8.5, participation: 45 },
      { monthsAgo: 1, logins: 16, delay: 7.0, participation: 50 },
      { monthsAgo: 0, logins: 12, delay: 9.0, participation: 40 }
    ]
  },
  // Students — high risk (struggling)
  {
    name: 'Karan Singh',
    email: 'student3@university.edu',
    password: 'Student@123456',
    role: 'student',
    department: 'Computer Science',
    studentProfile: {
      rollNumber: 'CS2024003',
      batch: '2024',
      semester: 3,
      program: 'B.Tech Computer Science'
    },
    // attendance: 50%, marks: 35%, engagement: low → HIGH risk
    attendanceProfile: { presentDays: 15, lateDays: 0, absentDays: 15 },
    marksProfile: [
      { type: 'ut1', marks: 9, max: 25 },
      { type: 'ut2', marks: 8, max: 25 },
      { type: 'cat1', marks: 17, max: 50 },
      { type: 'cat2', marks: 16, max: 50 },
      { type: 'semester', marks: 32, max: 100 }
    ],
    engagementProfile: [
      { monthsAgo: 2, logins: 5, delay: 24.0, participation: 15 },
      { monthsAgo: 1, logins: 4, delay: 28.0, participation: 10 },
      { monthsAgo: 0, logins: 3, delay: 30.0, participation: 8 }
    ]
  }
];

// ─── main ────────────────────────────────────────────────────────────────────

async function seed() {
  await connectDB();
  console.log('\n🌱  Starting database seed...\n');

  const adminUser = await User.findOne({ email: 'admin@university.edu' });
  if (!adminUser) {
    console.log('  ⚠  Admin not found — creating admin...');
  }

  const createdUsers   = {};
  const createdStudents = {};

  // ── 1. Upsert Users ──────────────────────────────────────────────────────
  console.log('📋  Step 1/5 — Creating users...');
  for (const def of USERS_SEED) {
    let user = await User.findOne({ email: def.email });
    if (user) {
      user.passwordHash = def.password;
      await user.save();
      console.log(`  ↳ Updated password for existing: ${def.email}`);
      createdUsers[def.email] = user;
      continue;
    }
    user = await User.create({
      name: def.name,
      email: def.email,
      passwordHash: def.password,
      role: def.role,
      department: def.department
    });
    createdUsers[def.email] = user;
    console.log(`  ✅ Created [${def.role}]: ${def.name} <${def.email}>`);
  }

  // ── 2. Upsert Student profiles ───────────────────────────────────────────
  console.log('\n📋  Step 2/5 — Creating student profiles...');
  const mentorUser = createdUsers['mentor@university.edu'];

  for (const def of USERS_SEED.filter(u => u.role === 'student')) {
    const user = createdUsers[def.email];
    let student = await Student.findOne({ userId: user._id });
    if (!student) {
      student = await Student.create({
        userId: user._id,
        rollNumber: def.studentProfile.rollNumber,
        batch: def.studentProfile.batch,
        semester: def.studentProfile.semester,
        program: def.studentProfile.program,
        department: def.department,
        assignedMentorId: mentorUser ? mentorUser._id : undefined
      });
      console.log(`  ✅ Student profile: ${def.name} (${def.studentProfile.rollNumber})`);
    } else {
      if (mentorUser && !student.assignedMentorId) {
        student.assignedMentorId = mentorUser._id;
        await student.save();
        console.log(`  ↳ Assigned mentor to: ${def.name}`);
      } else {
        console.log(`  ↳ Exists: student profile for ${def.name}`);
      }
    }
    createdStudents[def.email] = student;
  }

  // ── 3. Seed Attendance ───────────────────────────────────────────────────
  console.log('\n📋  Step 3/5 — Seeding attendance records...');
  const adminRef = createdUsers['admin@university.edu'];

  for (const def of USERS_SEED.filter(u => u.role === 'student')) {
    const student = createdStudents[def.email];
    const { presentDays, lateDays, absentDays } = def.attendanceProfile;
    const total = presentDays + lateDays + absentDays;

    for (const subject of SUBJECTS) {
      // Build status sequence
      const statuses = [
        ...Array(presentDays).fill('present'),
        ...Array(lateDays).fill('late'),
        ...Array(absentDays).fill('absent')
      ];
      // Shuffle deterministically
      statuses.sort((a, b) => (a < b ? -1 : 1));

      let inserted = 0;
      for (let i = 0; i < total; i++) {
        const date = daysAgo(total - i);
        const exists = await Attendance.findOne({ studentId: student._id, subject, date });
        if (!exists) {
          await Attendance.create({
            studentId: student._id,
            subject,
            date,
            status: statuses[i],
            recordedBy: adminRef._id
          });
          inserted++;
        }
      }
      console.log(`  ✅ ${def.name} | ${subject}: ${inserted} attendance records`);
    }
  }

  // ── 4. Seed Assessments & Engagement ─────────────────────────────────────
  console.log('\n📋  Step 4/5 — Seeding assessments & engagement...');

  for (const def of USERS_SEED.filter(u => u.role === 'student')) {
    const student = createdStudents[def.email];

    // Assessments (same marks for each subject for simplicity)
    for (const subject of SUBJECTS) {
      for (let i = 0; i < def.marksProfile.length; i++) {
        const m = def.marksProfile[i];
        const date = daysAgo(60 - i * 10);
        const exists = await Assessment.findOne({
          studentId: student._id,
          subject,
          type: m.type,
          date
        });
        if (!exists) {
          await Assessment.create({
            studentId: student._id,
            subject,
            type: m.type,
            marksObtained: m.marks,
            maxMarks: m.max,
            date,
            recordedBy: adminRef._id
          });
        }
      }
      console.log(`  ✅ ${def.name} | ${subject}: ${def.marksProfile.length} assessment records`);
    }

    // Engagement
    for (const ep of def.engagementProfile) {
      const period = monthPeriod(ep.monthsAgo);
      const exists = await Engagement.findOne({ studentId: student._id, period });
      if (!exists) {
        await Engagement.create({
          studentId: student._id,
          period,
          loginCount: ep.logins,
          avgSubmissionDelayHours: ep.delay,
          participationScore: ep.participation
        });
      }
    }
    console.log(`  ✅ ${def.name}: ${def.engagementProfile.length} engagement records`);
  }

  // ── 5. Compute Risk Scores ────────────────────────────────────────────────
  console.log('\n📋  Step 5/5 — Computing risk scores...');

  for (const def of USERS_SEED.filter(u => u.role === 'student')) {
    const student = createdStudents[def.email];
    for (const subject of SUBJECTS) {
      try {
        const risk = await calculateStudentRisk(student._id, subject);
        console.log(`  ✅ ${def.name} | ${subject}: score=${risk.score} level=${risk.riskLevel}`);
      } catch (err) {
        console.log(`  ⚠  ${def.name} | ${subject}: ${err.message}`);
      }
    }
  }

  console.log('\n✨  Seed complete! Summary of test accounts:\n');
  console.table([
    { Role: 'Admin',   Email: 'admin@university.edu',   Password: 'Admin@123456'   },
    { Role: 'Faculty', Email: 'faculty1@university.edu', Password: 'Faculty@123456' },
    { Role: 'Faculty', Email: 'faculty2@university.edu', Password: 'Faculty@123456' },
    { Role: 'Mentor',  Email: 'mentor@university.edu',   Password: 'Mentor@123456'  },
    { Role: 'Student (LOW risk)',    Email: 'student1@university.edu', Password: 'Student@123456' },
    { Role: 'Student (MEDIUM risk)', Email: 'student2@university.edu', Password: 'Student@123456' },
    { Role: 'Student (HIGH risk)',   Email: 'student3@university.edu', Password: 'Student@123456' }
  ]);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
