/**
 * seedData.js — Expanded seed script for Student Risk Prediction Platform
 * 
 * Creates:
 *   - 1 Admin
 *   - 3 Faculty users (across Computer Science and Information Technology)
 *   - 2 Mentors
 *   - 8 Students spanning diverse realistic risk profiles (High, Medium, Low)
 *   - Attendance records (30 days per subject)
 *   - Multi-format test assessment records (UT-1, UT-2, CAT-1, CAT-2, Semester)
 *   - Monthly LMS engagement records
 *   - Realistic mentor interventions (with categories, follow-ups, and milestone outcomes)
 *   - Real-time calculated risk scores
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
const Intervention = require('./models/Intervention');
const { calculateStudentRisk } = require('./services/riskCalculationService');

// ─── helpers ────────────────────────────────────────────────────────────────

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(8, 0, 0, 0);
  return d;
}

function daysAhead(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(10, 0, 0, 0);
  return d;
}

function monthPeriod(monthsAgo) {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ─── seed definitions ────────────────────────────────────────────────────────

const SUBJECTS = ['Mathematics', 'Data Structures', 'Database Systems'];

const USERS_SEED = [
  // ── Admins ─────────────────────────────────────────────────────────────
  {
    name: 'System Administrator',
    email: 'admin@university.edu',
    password: 'Admin@123456',
    role: 'admin',
    department: 'Administration'
  },
  // ── Faculty ────────────────────────────────────────────────────────────
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
    name: 'Dr. Rajesh Kumar',
    email: 'faculty3@university.edu',
    password: 'Faculty@123456',
    role: 'faculty',
    department: 'Information Technology'
  },
  // ── Mentors ────────────────────────────────────────────────────────────
  {
    name: 'Ms. Anita Nair',
    email: 'mentor1@university.edu',
    password: 'Mentor@123456',
    role: 'mentor',
    department: 'Computer Science'
  },
  {
    name: 'Mr. David Wilson',
    email: 'mentor2@university.edu',
    password: 'Mentor@123456',
    role: 'mentor',
    department: 'Information Technology'
  },

  // ── Students: Computer Science Cohort (Mentored by Anita Nair) ───────────
  // Student 1: High Achiever (Low Risk)
  {
    name: 'Arjun Mehta',
    email: 'student1@university.edu',
    password: 'Student@123456',
    role: 'student',
    department: 'Computer Science',
    mentorEmail: 'mentor1@university.edu',
    studentProfile: {
      rollNumber: 'CS2024001',
      batch: '2024',
      semester: 3,
      program: 'B.Tech Computer Science'
    },
    attendanceProfile: { presentDays: 28, lateDays: 1, absentDays: 1 }, // 96%
    marksProfile: [
      { type: 'ut1', marks: 24, max: 25 },
      { type: 'ut2', marks: 25, max: 25 },
      { type: 'cat1', marks: 47, max: 50 },
      { type: 'cat2', marks: 48, max: 50 },
      { type: 'semester', marks: 92, max: 100 }
    ],
    engagementProfile: [
      { monthsAgo: 2, logins: 28, delay: 1.0, participation: 85 },
      { monthsAgo: 1, logins: 30, delay: 0.5, participation: 90 },
      { monthsAgo: 0, logins: 26, delay: 0.8, participation: 88 }
    ]
  },

  // Student 2: Borderline (Medium Risk)
  {
    name: 'Sneha Patel',
    email: 'student2@university.edu',
    password: 'Student@123456',
    role: 'student',
    department: 'Computer Science',
    mentorEmail: 'mentor1@university.edu',
    studentProfile: {
      rollNumber: 'CS2024002',
      batch: '2024',
      semester: 3,
      program: 'B.Tech Computer Science'
    },
    attendanceProfile: { presentDays: 20, lateDays: 2, absentDays: 8 }, // 73%
    marksProfile: [
      { type: 'ut1', marks: 16, max: 25 },
      { type: 'ut2', marks: 15, max: 25 },
      { type: 'cat1', marks: 32, max: 50 },
      { type: 'cat2', marks: 30, max: 50 },
      { type: 'semester', marks: 59, max: 100 }
    ],
    engagementProfile: [
      { monthsAgo: 2, logins: 15, delay: 8.0, participation: 55 },
      { monthsAgo: 1, logins: 14, delay: 7.5, participation: 50 },
      { monthsAgo: 0, logins: 12, delay: 9.0, participation: 45 }
    ]
  },

  // Student 3: Chronic Struggler (High Risk)
  {
    name: 'Karan Singh',
    email: 'student3@university.edu',
    password: 'Student@123456',
    role: 'student',
    department: 'Computer Science',
    mentorEmail: 'mentor1@university.edu',
    studentProfile: {
      rollNumber: 'CS2024003',
      batch: '2024',
      semester: 3,
      program: 'B.Tech Computer Science'
    },
    attendanceProfile: { presentDays: 14, lateDays: 1, absentDays: 15 }, // 50%
    marksProfile: [
      { type: 'ut1', marks: 8, max: 25 },
      { type: 'ut2', marks: 7, max: 25 },
      { type: 'cat1', marks: 15, max: 50 },
      { type: 'cat2', marks: 14, max: 50 },
      { type: 'semester', marks: 30, max: 100 }
    ],
    engagementProfile: [
      { monthsAgo: 2, logins: 6, delay: 24.0, participation: 18 },
      { monthsAgo: 1, logins: 4, delay: 30.0, participation: 12 },
      { monthsAgo: 0, logins: 3, delay: 36.0, participation: 10 }
    ]
  },

  // Student 4: Attendance Decline (High Risk)
  {
    name: 'Ananya Roy',
    email: 'student4@university.edu',
    password: 'Student@123456',
    role: 'student',
    department: 'Computer Science',
    mentorEmail: 'mentor1@university.edu',
    studentProfile: {
      rollNumber: 'CS2024004',
      batch: '2024',
      semester: 3,
      program: 'B.Tech Computer Science'
    },
    attendanceProfile: { presentDays: 12, lateDays: 0, absentDays: 18 }, // 40%
    marksProfile: [
      { type: 'ut1', marks: 19, max: 25 },
      { type: 'ut2', marks: 17, max: 25 },
      { type: 'cat1', marks: 34, max: 50 },
      { type: 'cat2', marks: 28, max: 50 },
      { type: 'semester', marks: 52, max: 100 }
    ],
    engagementProfile: [
      { monthsAgo: 2, logins: 18, delay: 4.0, participation: 65 },
      { monthsAgo: 1, logins: 10, delay: 14.0, participation: 35 },
      { monthsAgo: 0, logins: 5, delay: 28.0, participation: 20 }
    ]
  },

  // Student 5: Solid Performer (Low Risk)
  {
    name: 'Rohan Gupta',
    email: 'student5@university.edu',
    password: 'Student@123456',
    role: 'student',
    department: 'Computer Science',
    mentorEmail: 'mentor1@university.edu',
    studentProfile: {
      rollNumber: 'CS2024005',
      batch: '2024',
      semester: 3,
      program: 'B.Tech Computer Science'
    },
    attendanceProfile: { presentDays: 26, lateDays: 2, absentDays: 2 }, // 93%
    marksProfile: [
      { type: 'ut1', marks: 21, max: 25 },
      { type: 'ut2', marks: 22, max: 25 },
      { type: 'cat1', marks: 41, max: 50 },
      { type: 'cat2', marks: 43, max: 50 },
      { type: 'semester', marks: 80, max: 100 }
    ],
    engagementProfile: [
      { monthsAgo: 2, logins: 24, delay: 1.5, participation: 78 },
      { monthsAgo: 1, logins: 25, delay: 1.2, participation: 82 },
      { monthsAgo: 0, logins: 22, delay: 1.4, participation: 80 }
    ]
  },

  // ── Students: Information Technology Cohort (Mentored by David Wilson) ──
  // Student 6: Declining Marks Trend (Medium-High Risk)
  {
    name: 'Meera Iyer',
    email: 'student6@university.edu',
    password: 'Student@123456',
    role: 'student',
    department: 'Information Technology',
    mentorEmail: 'mentor2@university.edu',
    studentProfile: {
      rollNumber: 'IT2024001',
      batch: '2024',
      semester: 3,
      program: 'B.Tech Information Technology'
    },
    attendanceProfile: { presentDays: 22, lateDays: 1, absentDays: 7 }, // 76%
    marksProfile: [
      { type: 'ut1', marks: 23, max: 25 },
      { type: 'ut2', marks: 19, max: 25 },
      { type: 'cat1', marks: 36, max: 50 },
      { type: 'cat2', marks: 25, max: 50 },
      { type: 'semester', marks: 44, max: 100 }
    ],
    engagementProfile: [
      { monthsAgo: 2, logins: 22, delay: 2.0, participation: 75 },
      { monthsAgo: 1, logins: 14, delay: 9.0, participation: 48 },
      { monthsAgo: 0, logins: 9, delay: 18.0, participation: 32 }
    ]
  },

  // Student 7: Consistent B-Grade (Low-Medium Risk)
  {
    name: 'Vikram Joshi',
    email: 'student7@university.edu',
    password: 'Student@123456',
    role: 'student',
    department: 'Information Technology',
    mentorEmail: 'mentor2@university.edu',
    studentProfile: {
      rollNumber: 'IT2024002',
      batch: '2024',
      semester: 3,
      program: 'B.Tech Information Technology'
    },
    attendanceProfile: { presentDays: 25, lateDays: 1, absentDays: 4 }, // 86%
    marksProfile: [
      { type: 'ut1', marks: 18, max: 25 },
      { type: 'ut2', marks: 19, max: 25 },
      { type: 'cat1', marks: 37, max: 50 },
      { type: 'cat2', marks: 38, max: 50 },
      { type: 'semester', marks: 74, max: 100 }
    ],
    engagementProfile: [
      { monthsAgo: 2, logins: 20, delay: 3.0, participation: 70 },
      { monthsAgo: 1, logins: 19, delay: 2.5, participation: 72 },
      { monthsAgo: 0, logins: 18, delay: 3.2, participation: 68 }
    ]
  },

  // Student 8: Low LMS Engagement (High Risk)
  {
    name: 'Tara Deshmukh',
    email: 'student8@university.edu',
    password: 'Student@123456',
    role: 'student',
    department: 'Information Technology',
    mentorEmail: 'mentor2@university.edu',
    studentProfile: {
      rollNumber: 'IT2024003',
      batch: '2024',
      semester: 3,
      program: 'B.Tech Information Technology'
    },
    attendanceProfile: { presentDays: 16, lateDays: 0, absentDays: 14 }, // 53%
    marksProfile: [
      { type: 'ut1', marks: 11, max: 25 },
      { type: 'ut2', marks: 10, max: 25 },
      { type: 'cat1', marks: 21, max: 50 },
      { type: 'cat2', marks: 20, max: 50 },
      { type: 'semester', marks: 38, max: 100 }
    ],
    engagementProfile: [
      { monthsAgo: 2, logins: 4, delay: 28.0, participation: 15 },
      { monthsAgo: 1, logins: 3, delay: 32.0, participation: 10 },
      { monthsAgo: 0, logins: 2, delay: 48.0, participation: 8 }
    ]
  }
];

// Sample structured mentor interventions to seed
const SAMPLE_INTERVENTIONS = [
  {
    studentRoll: 'CS2024003', // Karan Singh
    mentorEmail: 'mentor1@university.edu',
    category: 'attendance',
    action: 'Convened academic probation meeting with student regarding <50% attendance record.',
    outcome: 'Student committed to attending morning remedial sessions. Target 75% attendance.',
    followUpDate: daysAhead(7),
    status: 'in-progress',
    notes: 'Informed parent/guardian. Assigned mentor student partner CS2024001.'
  },
  {
    studentRoll: 'CS2024004', // Ananya Roy
    mentorEmail: 'mentor1@university.edu',
    category: 'psychological',
    action: 'Referred to student counseling wellness center following sudden attendance drop.',
    outcome: 'Student attended initial wellness session. Personal illness resolved.',
    followUpDate: daysAhead(14),
    status: 'open',
    notes: 'Medical certificate submitted for past 2 weeks.'
  },
  {
    studentRoll: 'CS2024002', // Sneha Patel
    mentorEmail: 'mentor1@university.edu',
    category: 'academic',
    action: 'Conducted 1-on-1 performance review for CAT-1 and CAT-2 Mathematics scores.',
    outcome: 'Provided curated formula sheet and practice problem sets.',
    followUpDate: daysAgo(5),
    status: 'resolved',
    notes: 'Sneha scored 65% on the subsequent quiz. Case closed successfully.'
  },
  {
    studentRoll: 'IT2024003', // Tara Deshmukh
    mentorEmail: 'mentor2@university.edu',
    category: 'career',
    action: 'Held academic motivation session. Discussed career goals and internship prerequisites.',
    outcome: 'Enrolled student in online LMS coding lab module.',
    followUpDate: daysAhead(10),
    status: 'in-progress',
    notes: 'Check LMS lab submission status on Friday.'
  },
  {
    studentRoll: 'IT2024001', // Meera Iyer
    mentorEmail: 'mentor2@university.edu',
    category: 'academic',
    action: 'Reviewed declining scores in Data Structures tests. Scheduled doubt clearing sessions.',
    outcome: 'Pairing with senior lab teaching assistant for hands-on pointer concepts.',
    followUpDate: daysAhead(5),
    status: 'open',
    notes: 'Midterm exam is in 3 weeks.'
  }
];

// ─── main ────────────────────────────────────────────────────────────────────

async function seed() {
  await connectDB();
  console.log('\n🌱  Starting comprehensive multi-account database seed...\n');

  const createdUsers   = {};
  const createdStudents = {};

  // ── 1. Upsert Users ──────────────────────────────────────────────────────
  console.log('📋  Step 1/6 — Upserting user accounts...');
  for (const def of USERS_SEED) {
    let user = await User.findOne({ email: def.email });
    if (user) {
      user.passwordHash = def.password;
      user.name = def.name;
      user.role = def.role;
      user.department = def.department;
      user.isActive = true;
      await user.save();
      console.log(`  ↳ Updated: ${def.email} (${def.role})`);
    } else {
      user = await User.create({
        name: def.name,
        email: def.email,
        passwordHash: def.password,
        role: def.role,
        department: def.department,
        isActive: true
      });
      console.log(`  ✅ Created: ${def.name} <${def.email}> [${def.role}]`);
    }
    createdUsers[def.email] = user;
  }

  // Also support legacy mentor@university.edu alias pointing to mentor1
  let legacyMentor = await User.findOne({ email: 'mentor@university.edu' });
  if (!legacyMentor) {
    await User.create({
      name: 'Ms. Anita Nair',
      email: 'mentor@university.edu',
      passwordHash: 'Mentor@123456',
      role: 'mentor',
      department: 'Computer Science',
      isActive: true
    });
  }

  // ── 2. Upsert Student profiles ───────────────────────────────────────────
  console.log('\n📋  Step 2/6 — Creating student profiles & assigning mentors...');
  for (const def of USERS_SEED.filter(u => u.role === 'student')) {
    const user = createdUsers[def.email];
    const assignedMentor = createdUsers[def.mentorEmail];

    let student = await Student.findOne({ rollNumber: def.studentProfile.rollNumber });
    if (!student) {
      student = await Student.create({
        userId: user._id,
        rollNumber: def.studentProfile.rollNumber,
        batch: def.studentProfile.batch,
        semester: def.studentProfile.semester,
        program: def.studentProfile.program,
        department: def.department,
        assignedMentorId: assignedMentor ? assignedMentor._id : undefined
      });
      console.log(`  ✅ Created profile: ${def.name} (${def.studentProfile.rollNumber})`);
    } else {
      student.assignedMentorId = assignedMentor ? assignedMentor._id : undefined;
      student.department = def.department;
      await student.save();
      console.log(`  ↳ Updated profile: ${def.name} (${def.studentProfile.rollNumber})`);
    }
    createdStudents[def.studentProfile.rollNumber] = student;
    createdStudents[def.email] = student;
  }

  // ── 3. Seed Attendance ───────────────────────────────────────────────────
  console.log('\n📋  Step 3/6 — Seeding realistic attendance history...');
  const adminRef = createdUsers['admin@university.edu'];

  for (const def of USERS_SEED.filter(u => u.role === 'student')) {
    const student = createdStudents[def.email];
    const { presentDays, lateDays, absentDays } = def.attendanceProfile;
    const total = presentDays + lateDays + absentDays;

    for (const subject of SUBJECTS) {
      // Build deterministically distributed status sequence
      const statuses = [
        ...Array(presentDays).fill('present'),
        ...Array(lateDays).fill('late'),
        ...Array(absentDays).fill('absent')
      ];
      // Deterministic spread
      statuses.sort((a, b) => (a.charCodeAt(0) % 2 === 0 ? 1 : -1));

      for (let i = 0; i < total; i++) {
        const date = daysAgo(total - i);
        await Attendance.findOneAndUpdate(
          { studentId: student._id, subject, date },
          {
            studentId: student._id,
            subject,
            date,
            status: statuses[i],
            recordedBy: adminRef._id
          },
          { upsert: true }
        );
      }
    }
    console.log(`  ✅ Logged attendance for ${def.name} (${def.studentProfile.rollNumber}) across 3 subjects`);
  }

  // ── 4. Seed Assessments (UT-1, UT-2, CAT-1, CAT-2, Semester) & Engagement ─
  console.log('\n📋  Step 4/6 — Seeding multi-format assessments & monthly LMS metrics...');

  for (const def of USERS_SEED.filter(u => u.role === 'student')) {
    const student = createdStudents[def.email];

    // Assessments
    for (const subject of SUBJECTS) {
      for (let i = 0; i < def.marksProfile.length; i++) {
        const m = def.marksProfile[i];
        const date = daysAgo(40 - i * 8);

        await Assessment.findOneAndUpdate(
          { studentId: student._id, subject, type: m.type, date },
          {
            studentId: student._id,
            subject,
            type: m.type,
            marksObtained: m.marks,
            maxMarks: m.max,
            date,
            recordedBy: adminRef._id
          },
          { upsert: true }
        );
      }
    }

    // Engagement
    for (const ep of def.engagementProfile) {
      const period = monthPeriod(ep.monthsAgo);
      await Engagement.findOneAndUpdate(
        { studentId: student._id, period },
        {
          studentId: student._id,
          period,
          loginCount: ep.logins,
          avgSubmissionDelayHours: ep.delay,
          participationScore: ep.participation
        },
        { upsert: true }
      );
    }
    console.log(`  ✅ Logged tests & LMS activity for ${def.name}`);
  }

  // ── 5. Seed Mentor Interventions ─────────────────────────────────────────
  console.log('\n📋  Step 5/6 — Seeding structured mentor interventions...');
  for (const item of SAMPLE_INTERVENTIONS) {
    const student = createdStudents[item.studentRoll];
    const mentor = createdUsers[item.mentorEmail];
    if (student && mentor) {
      const existing = await Intervention.findOne({ studentId: student._id, action: item.action });
      if (!existing) {
        await Intervention.create({
          studentId: student._id,
          mentorId: mentor._id,
          category: item.category,
          action: item.action,
          outcome: item.outcome,
          followUpDate: item.followUpDate,
          status: item.status,
          notes: item.notes
        });
        console.log(`  ✅ Logged [${item.category}] intervention for ${item.studentRoll} by ${mentor.name}`);
      }
    }
  }

  // ── 6. Compute Risk Scores ────────────────────────────────────────────────
  console.log('\n📋  Step 6/6 — Computing risk scores for all students...');

  for (const def of USERS_SEED.filter(u => u.role === 'student')) {
    const student = createdStudents[def.email];
    for (const subject of SUBJECTS) {
      try {
        const risk = await calculateStudentRisk(student._id, subject);
        console.log(`  ✅ ${def.name} | ${subject}: Score=${risk.score} (${risk.riskLevel.toUpperCase()})`);
      } catch (err) {
        console.log(`  ⚠  ${def.name} | ${subject}: ${err.message}`);
      }
    }
  }

  console.log('\n✨  Seed complete! Summary of all accounts ready to use:\n');
  console.table([
    { Role: 'Admin', Email: 'admin@university.edu', Password: 'Admin@123456', Department: 'Administration' },
    { Role: 'Faculty (CS)', Email: 'faculty1@university.edu', Password: 'Faculty@123456', Department: 'Computer Science' },
    { Role: 'Faculty (CS)', Email: 'faculty2@university.edu', Password: 'Faculty@123456', Department: 'Computer Science' },
    { Role: 'Faculty (IT)', Email: 'faculty3@university.edu', Password: 'Faculty@123456', Department: 'Information Technology' },
    { Role: 'Mentor (CS)', Email: 'mentor1@university.edu', Password: 'Mentor@123456', Department: 'Computer Science' },
    { Role: 'Mentor (IT)', Email: 'mentor2@university.edu', Password: 'Mentor@123456', Department: 'Information Technology' },
    { Role: 'Student 1 (LOW Risk)', Email: 'student1@university.edu', Password: 'Student@123456', Department: 'Computer Science' },
    { Role: 'Student 2 (MEDIUM Risk)', Email: 'student2@university.edu', Password: 'Student@123456', Department: 'Computer Science' },
    { Role: 'Student 3 (HIGH Risk)', Email: 'student3@university.edu', Password: 'Student@123456', Department: 'Computer Science' },
    { Role: 'Student 4 (HIGH Risk)', Email: 'student4@university.edu', Password: 'Student@123456', Department: 'Computer Science' },
    { Role: 'Student 5 (LOW Risk)', Email: 'student5@university.edu', Password: 'Student@123456', Department: 'Computer Science' },
    { Role: 'Student 6 (HIGH Trend Risk)', Email: 'student6@university.edu', Password: 'Student@123456', Department: 'Information Technology' },
    { Role: 'Student 7 (LOW-MED Risk)', Email: 'student7@university.edu', Password: 'Student@123456', Department: 'Information Technology' },
    { Role: 'Student 8 (HIGH LMS Risk)', Email: 'student8@university.edu', Password: 'Student@123456', Department: 'Information Technology' }
  ]);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
