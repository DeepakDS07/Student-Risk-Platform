import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import Navbar from '../components/Navbar';
import RiskBadge from '../components/RiskBadge';
import ErrorAlert from '../components/ErrorAlert';
import SuccessToast from '../components/SuccessToast';
import LoadingSpinner from '../components/LoadingSpinner';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { BookOpen, Users, PlusCircle, ArrowRight, Filter, AlertTriangle, Search, Download, FileSpreadsheet } from 'lucide-react';

const COLORS = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#10b981'
};

const FacultyDashboard = () => {
  const navigate = useNavigate();

  // Selected Class & Filter State
  const [selectedClass, setSelectedClass] = useState('Computer Science');
  const [riskFilter, setRiskFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Data State
  const [studentsList, setStudentsList] = useState([]);
  const [classRiskData, setClassRiskData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Upload Form State
  const [uploadType, setUploadType] = useState('attendance');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [subjectInput, setSubjectInput] = useState('Mathematics');
  const [dateInput, setDateInput] = useState(new Date().toISOString().substring(0, 10));
  const [statusInput, setStatusInput] = useState('present');

  // Assessment upload fields
  const [assessmentType, setAssessmentType] = useState('internal');
  const [marksObtained, setMarksObtained] = useState('');
  const [maxMarks, setMaxMarks] = useState('50');

  // Engagement upload fields
  const [periodInput, setPeriodInput] = useState('2026-10');
  const [loginCount, setLoginCount] = useState('15');
  const [avgSubmissionDelay, setAvgSubmissionDelay] = useState('2');
  const [participationScore, setParticipationScore] = useState('80');

  // UI Notifications
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Students & Risk Summary
  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch students list
      const studentsRes = await axiosInstance.get('/users/students');
      if (studentsRes.data && studentsRes.data.success) {
        setStudentsList(studentsRes.data.data);
        if (studentsRes.data.data.length > 0 && !selectedStudentId) {
          setSelectedStudentId(studentsRes.data.data[0]._id);
        }
      }

      // Fetch class risk distribution
      const riskRes = await axiosInstance.get(`/risk/class/${encodeURIComponent(selectedClass)}`);
      if (riskRes.data && riskRes.data.success) {
        setClassRiskData(riskRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load faculty dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedClass]);

  const handleDataUpload = async (e) => {
    e.preventDefault();
    if (!selectedStudentId) {
      setError('Please select a target student');
      return;
    }

    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      if (uploadType === 'attendance') {
        const res = await axiosInstance.post('/attendance', {
          studentId: selectedStudentId,
          subject: subjectInput,
          date: dateInput,
          status: statusInput
        });
        if (res.data.success) {
          setSuccess('Attendance record added successfully!');
        }
      } else if (uploadType === 'assessment') {
        const res = await axiosInstance.post('/assessment', {
          studentId: selectedStudentId,
          subject: subjectInput,
          type: assessmentType,
          marksObtained: Number(marksObtained),
          maxMarks: Number(maxMarks),
          date: dateInput
        });
        if (res.data.success) {
          setSuccess('Assessment record added successfully!');
          setMarksObtained('');
        }
      } else if (uploadType === 'engagement') {
        const res = await axiosInstance.post('/engagement', {
          studentId: selectedStudentId,
          period: periodInput,
          loginCount: Number(loginCount),
          avgSubmissionDelayHours: Number(avgSubmissionDelay),
          participationScore: Number(participationScore)
        });
        if (res.data.success) {
          setSuccess('Engagement record updated successfully!');
        }
      }

      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to submit data record');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Recharts Distribution Data
  const chartData = classRiskData
    ? [
        { name: 'Low Risk', value: classRiskData.distribution.low || 0, color: COLORS.low },
        { name: 'Medium Risk', value: classRiskData.distribution.medium || 0, color: COLORS.medium },
        { name: 'High Risk', value: classRiskData.distribution.high || 0, color: COLORS.high }
      ]
    : [];

  const handleExportCSV = () => {
    if (!classRiskData?.students || classRiskData.students.length === 0) return;
    const headers = ['Student ID', 'Student Name', 'Overall Risk', 'Subjects', 'Last Computed'];
    const rows = filteredStudents.map((s) => [
      `"${s.studentId}"`,
      `"${s.name}"`,
      `"${s.overallRisk.toUpperCase()}"`,
      `"${(s.subjects || []).join(', ')}"`,
      `"${s.lastComputedAt ? new Date(s.lastComputedAt).toLocaleDateString() : 'N/A'}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Risk_Report_${selectedClass.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredStudents = (classRiskData?.students || []).filter((s) => {
    if (riskFilter !== 'all' && s.overallRisk !== riskFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const name = s.name?.toLowerCase() || '';
      const subjects = (s.subjects || []).join(' ').toLowerCase();
      if (!name.includes(q) && !subjects.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-900 pb-12">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Top Header & Class Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 bg-slate-800 border border-slate-700/80 rounded-2xl p-6 shadow-xl">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Faculty Risk Analytics Dashboard</h1>
            <p className="text-sm text-slate-400">Monitor class performance signals and log academic metrics</p>
          </div>

          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-teal-400" />
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-100 text-sm font-semibold rounded-xl px-4 py-2.5 focus:outline-none focus:border-teal-500"
            >
              <option value="Computer Science">Computer Science</option>
              <option value="Information Technology">Information Technology</option>
              <option value="Electronics">Electronics</option>
              <option value="all">All Departments</option>
            </select>
          </div>
        </div>

        <ErrorAlert message={error} onClose={() => setError('')} />
        <SuccessToast message={success} onClose={() => setSuccess('')} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Recharts Pie Chart Overview */}
          <div className="lg:col-span-1 bg-slate-800 border border-slate-700/80 rounded-2xl p-6 shadow-xl flex flex-col items-center">
            <h2 className="text-lg font-bold text-slate-100 mb-2 w-full text-left">Class Risk Distribution</h2>
            <p className="text-xs text-slate-400 mb-4 w-full text-left">Overview of student risk categories</p>

            {loading ? (
              <LoadingSpinner text="Computing distribution..." />
            ) : (
              <div className="w-full h-64 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                      itemStyle={{ color: '#f8fafc' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Quick Data Upload Section */}
          <div className="lg:col-span-2 bg-slate-800 border border-slate-700/80 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-700/60">
              <PlusCircle className="w-5 h-5 text-teal-400" />
              <h2 className="text-lg font-bold text-slate-100">Quick Data Ingestion</h2>
            </div>

            <div className="flex gap-2 mb-5">
              {['attendance', 'assessment', 'engagement'].map((t) => (
                <button
                  key={t}
                  onClick={() => setUploadType(t)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider capitalize transition-all ${
                    uploadType === t
                      ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                      : 'bg-slate-900/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <form onSubmit={handleDataUpload} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Target Student</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-teal-500"
                >
                  {studentsList.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.userId?.name || 'Student'} ({s.rollNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={subjectInput}
                  onChange={(e) => setSubjectInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Attendance Form */}
              {uploadType === 'attendance' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Date</label>
                    <input
                      type="date"
                      required
                      value={dateInput}
                      onChange={(e) => setDateInput(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Status</label>
                    <select
                      value={statusInput}
                      onChange={(e) => setStatusInput(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-teal-500"
                    >
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                      <option value="late">Late</option>
                    </select>
                  </div>
                </>
              )}

              {/* Assessment Form */}
              {uploadType === 'assessment' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Assessment Type</label>
                    <select
                      value={assessmentType}
                      onChange={(e) => setAssessmentType(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-teal-500"
                    >
                      <option value="internal">Internal Exam</option>
                      <option value="assignment">Assignment</option>
                      <option value="semester">Semester Exam</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Date</label>
                    <input
                      type="date"
                      required
                      value={dateInput}
                      onChange={(e) => setDateInput(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Marks Obtained</label>
                    <input
                      type="number"
                      required
                      placeholder="42"
                      value={marksObtained}
                      onChange={(e) => setMarksObtained(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Max Marks</label>
                    <input
                      type="number"
                      required
                      placeholder="50"
                      value={maxMarks}
                      onChange={(e) => setMaxMarks(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </>
              )}

              {/* Engagement Form */}
              {uploadType === 'engagement' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Period (YYYY-MM)</label>
                    <input
                      type="text"
                      required
                      placeholder="2026-10"
                      value={periodInput}
                      onChange={(e) => setPeriodInput(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Login Count</label>
                    <input
                      type="number"
                      required
                      value={loginCount}
                      onChange={(e) => setLoginCount(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Avg Delay (Hours)</label>
                    <input
                      type="number"
                      required
                      value={avgSubmissionDelay}
                      onChange={(e) => setAvgSubmissionDelay(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Participation (0-100)</label>
                    <input
                      type="number"
                      required
                      value={participationScore}
                      onChange={(e) => setParticipationScore(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </>
              )}

              <div className="sm:col-span-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-teal-600/20 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? 'Submitting Record...' : 'Submit Data Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Students Risk Table */}
        <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4 border-b border-slate-700/60 gap-4">
            <div className="flex items-center gap-2.5">
              <Users className="w-5 h-5 text-teal-400" />
              <h2 className="text-lg font-bold text-slate-100">Students Risk Registry</h2>
            </div>

            {/* Risk Filter & Export Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleExportCSV}
                title="Export current filtered risk report as CSV"
                className="px-3 py-1.5 bg-slate-700/60 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 border border-slate-600/50"
              >
                <Download className="w-3.5 h-3.5 text-teal-400" />
                Export CSV
              </button>

              <div className="flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-slate-400" />
                {['all', 'high', 'medium', 'low'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setRiskFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                      riskFilter === f
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {f === 'all' ? 'All' : `${f} Risk`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search students in class by name or subjects evaluated..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-teal-500 transition-all"
            />
          </div>

          {loading ? (
            <LoadingSpinner text="Fetching student risk scores..." />
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2 opacity-60" />
              No student risk records match the selected filter. Click student detail or compute risk.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-700/80 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Subjects Evaluated</th>
                    <th className="py-3 px-4">Overall Risk Level</th>
                    <th className="py-3 px-4">Last Evaluated</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/40 text-sm">
                  {filteredStudents.map((s) => (
                    <tr
                      key={s.studentId}
                      onClick={() => navigate(`/faculty/student/${s.studentId}`)}
                      className="hover:bg-slate-700/30 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-semibold text-slate-100">{s.name}</td>
                      <td className="py-3.5 px-4 text-xs text-slate-300">
                        {s.subjects ? s.subjects.join(', ') : 'N/A'}
                      </td>
                      <td className="py-3.5 px-4">
                        <RiskBadge level={s.overallRisk} />
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400">
                        {s.lastComputedAt ? new Date(s.lastComputedAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="text-teal-400 text-xs font-semibold inline-flex items-center gap-1 hover:underline">
                          View Details <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default FacultyDashboard;
