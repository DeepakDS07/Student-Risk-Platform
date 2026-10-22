import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import Navbar from '../components/Navbar';
import RiskBadge from '../components/RiskBadge';
import ErrorAlert from '../components/ErrorAlert';
import SuccessToast from '../components/SuccessToast';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  UserCheck,
  MessageSquarePlus,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Activity,
  Search,
  Eye,
  BookOpen,
  Calendar,
  X,
  Users,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

const MentorDashboard = () => {
  const { user } = useContext(AuthContext);

  const [studentsList, setStudentsList] = useState([]);
  const [interventionsList, setInterventionsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Student Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [cohortFilter, setCohortFilter] = useState('mine'); // 'mine' or 'all'

  // Student Detail Modal State
  const [selectedStudentForModal, setSelectedStudentForModal] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalRiskData, setModalRiskData] = useState(null);
  const [modalAttendanceStats, setModalAttendanceStats] = useState(null);
  const [modalAssessmentStats, setModalAssessmentStats] = useState(null);
  const [modalEngagementStats, setModalEngagementStats] = useState(null);

  // Intervention Form State
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [actionInput, setActionInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('academic');
  const [followUpDateInput, setFollowUpDateInput] = useState('');
  const [outcomeInput, setOutcomeInput] = useState('');
  const [statusInput, setStatusInput] = useState('open');
  const [notesInput, setNotesInput] = useState('');

  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchMentorData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch students list (with risk and mentor details)
      const studentsRes = await axiosInstance.get('/users/students');
      if (studentsRes.data && studentsRes.data.success) {
        setStudentsList(studentsRes.data.data);
        if (studentsRes.data.data.length > 0 && !selectedStudentId) {
          setSelectedStudentId(studentsRes.data.data[0]._id);
        }
      }

      // Fetch logged interventions
      const mentorId = user?._id || user?.id;
      if (mentorId) {
        const intRes = await axiosInstance.get(`/interventions/mentor/${mentorId}`);
        if (intRes.data && intRes.data.success) {
          setInterventionsList(intRes.data.data);
        }
      }
    } catch (err) {
      console.error('Failed to load mentor dashboard data:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load mentor data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMentorData();
  }, [user]);

  // Handle open student details modal
  const handleOpenStudentModal = async (student) => {
    setSelectedStudentForModal(student);
    setModalLoading(true);
    setModalRiskData(null);
    setModalAttendanceStats(null);
    setModalAssessmentStats(null);
    setModalEngagementStats(null);

    const sId = student._id;
    try {
      // Fetch in parallel for speed
      const [rRes, attRes, assRes, engRes] = await Promise.allSettled([
        axiosInstance.get(`/risk/student/${sId}`),
        axiosInstance.get(`/attendance/stats/student/${sId}`),
        axiosInstance.get(`/assessment/stats/student/${sId}`),
        axiosInstance.get(`/engagement/stats/student/${sId}`)
      ]);

      if (rRes.status === 'fulfilled' && rRes.value.data?.success) {
        setModalRiskData(rRes.value.data.data);
      }
      if (attRes.status === 'fulfilled' && attRes.value.data?.success) {
        setModalAttendanceStats(attRes.value.data.data);
      }
      if (assRes.status === 'fulfilled' && assRes.value.data?.success) {
        setModalAssessmentStats(assRes.value.data.data);
      }
      if (engRes.status === 'fulfilled' && engRes.value.data?.success) {
        setModalEngagementStats(engRes.value.data.data);
      }
    } catch (err) {
      console.error('Failed to load student details:', err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleSelectStudentForIntervention = (studentId) => {
    setSelectedStudentId(studentId);
    if (selectedStudentForModal) {
      setSelectedStudentForModal(null);
    }
    const formElement = document.getElementById('intervention-form-section');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleLogIntervention = async (e) => {
    e.preventDefault();
    if (!selectedStudentId || !actionInput) {
      setError('Please select a student and provide an action description');
      return;
    }

    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const res = await axiosInstance.post('/interventions', {
        studentId: selectedStudentId,
        action: actionInput,
        category: categoryInput,
        followUpDate: followUpDateInput || undefined,
        outcome: outcomeInput || undefined,
        status: statusInput,
        notes: notesInput
      });

      if (res.data && res.data.success) {
        setSuccess('Intervention logged successfully!');
        setActionInput('');
        setCategoryInput('academic');
        setFollowUpDateInput('');
        setOutcomeInput('');
        setNotesInput('');
        setStatusInput('open');
        fetchMentorData();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to log intervention');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (interventionId, newStatus) => {
    try {
      const res = await axiosInstance.put(`/interventions/${interventionId}`, {
        status: newStatus
      });
      if (res.data && res.data.success) {
        setInterventionsList((prev) =>
          prev.map((i) => (i._id === interventionId ? { ...i, status: newStatus } : i))
        );
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Filter students
  const mentorId = user?._id || user?.id;
  const filteredStudents = studentsList.filter((s) => {
    // Cohort filter
    if (cohortFilter === 'mine') {
      const assigned = s.assignedMentorId?._id || s.assignedMentorId;
      if (assigned !== mentorId) return false;
    }

    // Risk level filter
    if (riskFilter !== 'all' && s.overallRisk !== riskFilter) {
      return false;
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const name = s.userId?.name?.toLowerCase() || '';
      const email = s.userId?.email?.toLowerCase() || '';
      const roll = s.rollNumber?.toLowerCase() || '';
      const dept = s.department?.toLowerCase() || '';
      if (!name.includes(q) && !email.includes(q) && !roll.includes(q) && !dept.includes(q)) {
        return false;
      }
    }

    return true;
  });

  const totalMyStudents = studentsList.filter((s) => {
    const assigned = s.assignedMentorId?._id || s.assignedMentorId;
    return assigned === mentorId;
  }).length;

  const highRiskCount = studentsList.filter((s) => {
    const assigned = s.assignedMentorId?._id || s.assignedMentorId;
    return (cohortFilter === 'all' || assigned === mentorId) && s.overallRisk === 'high';
  }).length;

  const totalInterventions = interventionsList.length;
  const resolvedCount = interventionsList.filter((i) => i.status === 'resolved').length;
  const inProgressCount = interventionsList.filter((i) => i.status === 'in-progress').length;
  const successRate = totalInterventions > 0 ? Math.round((resolvedCount / totalInterventions) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-900 pb-12">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Mentor Guidance Hub</h1>
            <p className="text-sm text-slate-400">
              Monitor academic signals of your mentee cohort, review risk factors, and record proactive interventions.
            </p>
          </div>
        </div>

        <ErrorAlert message={error} onClose={() => setError('')} />
        <SuccessToast message={success} onClose={() => setSuccess('')} />

        {/* Impact Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Assigned Mentees</span>
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-100 mt-3">{totalMyStudents}</p>
            <span className="text-xs text-slate-400 mt-1 block">Students under your mentorship</span>
          </div>

          <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">High Risk Alert</span>
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold text-rose-400 mt-3">{highRiskCount}</p>
            <span className="text-xs text-slate-400 mt-1 block">Students requiring immediate support</span>
          </div>

          <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Interventions Logged</span>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                <MessageSquarePlus className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-100 mt-3">{totalInterventions}</p>
            <span className="text-xs text-slate-400 mt-1 block">{inProgressCount} in-progress cases</span>
          </div>

          <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Intervention Success</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold text-emerald-400 mt-3">{successRate}%</p>
            <span className="text-xs text-slate-400 mt-1 block">{resolvedCount} resolved interventions</span>
          </div>
        </div>

        {/* ── Section 1: Mentored Students Directory ────────────────────────────── */}
        <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-6 shadow-xl mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 pb-4 border-b border-slate-700/60 gap-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100">Mentored Students Directory & Academic Signals</h2>
                <p className="text-xs text-slate-400">Click any student to view their academic signals or log early interventions</p>
              </div>
            </div>

            {/* Cohort Switcher */}
            <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-xl p-1 self-start md:self-auto">
              <button
                onClick={() => setCohortFilter('mine')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  cohortFilter === 'mine'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                My Mentees ({totalMyStudents})
              </button>
              <button
                onClick={() => setCohortFilter('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  cohortFilter === 'all'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All Students ({studentsList.length})
              </button>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search students by name, roll number, or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-teal-500 transition-all"
              />
            </div>

            {/* Risk Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {['all', 'high', 'medium', 'low'].map((level) => (
                <button
                  key={level}
                  onClick={() => setRiskFilter(level)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-all border ${
                    riskFilter === level
                      ? level === 'high'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                        : level === 'medium'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : level === 'low'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                        : 'bg-teal-500/20 text-teal-300 border-teal-500/50'
                      : 'bg-slate-900 border-slate-700/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {level === 'all' ? 'All Risks' : `${level} Risk`}
                </button>
              ))}
            </div>
          </div>

          {/* Students Table */}
          {loading ? (
            <LoadingSpinner text="Loading mentee roster..." />
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-10 bg-slate-900/40 rounded-xl border border-slate-700/50">
              <UserCheck className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-300">No students found matching your criteria</p>
              <p className="text-xs text-slate-500 mt-1">
                {cohortFilter === 'mine'
                  ? 'Switch to "All Students" to browse all university students or adjust search filters.'
                  : 'Adjust search keywords or risk filter.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-700/80 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-3">Student Name</th>
                    <th className="py-3 px-3">Roll & Dept</th>
                    <th className="py-3 px-3">Calculated Risk</th>
                    <th className="py-3 px-3">Warning Triggers</th>
                    <th className="py-3 px-3">Interventions</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/40 text-sm">
                  {filteredStudents.map((s) => {
                    const studentInterventions = interventionsList.filter(
                      (i) => i.studentId?._id === s._id || i.studentId === s._id
                    );
                    const openCount = studentInterventions.filter((i) => i.status === 'open' || i.status === 'in-progress').length;

                    return (
                      <tr key={s._id} className="hover:bg-slate-700/20 transition-colors">
                        <td className="py-3.5 px-3">
                          <div className="font-semibold text-slate-100 flex items-center gap-2">
                            {s.userId?.name || 'Student'}
                            {s.assignedMentorId?._id === mentorId && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/30">
                                My Mentee
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400">{s.userId?.email || 'N/A'}</div>
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="text-xs font-mono font-medium text-slate-200">{s.rollNumber}</div>
                          <div className="text-xs text-slate-400">{s.department} · Sem {s.semester}</div>
                        </td>

                        <td className="py-3.5 px-3">
                          <RiskBadge level={s.overallRisk || 'low'} score={s.highestRiskScore} />
                        </td>

                        <td className="py-3.5 px-3">
                          {s.warningFactors && s.warningFactors.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {s.warningFactors.map((f, fIdx) => (
                                <span
                                  key={fIdx}
                                  className="bg-rose-500/10 text-rose-300 border border-rose-500/20 text-[10px] px-2 py-0.5 rounded"
                                >
                                  {f}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-emerald-400 font-medium">No warning triggers</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3">
                          {studentInterventions.length > 0 ? (
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded border inline-block ${
                                openCount > 0
                                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              }`}
                            >
                              {openCount > 0 ? `${openCount} Open Action` : `${studentInterventions.length} Resolved`}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500 italic">None logged</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenStudentModal(s)}
                              title="View academic signals and risk breakdown"
                              className="px-2.5 py-1.5 bg-slate-700/60 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 border border-slate-600/50"
                            >
                              <Eye className="w-3.5 h-3.5 text-teal-400" />
                              View Profile
                            </button>
                            <button
                              onClick={() => handleSelectStudentForIntervention(s._id)}
                              title="Log intervention for this student"
                              className="px-2.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1 shadow-sm"
                            >
                              <MessageSquarePlus className="w-3.5 h-3.5" />
                              Intervene
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Section 2: Intervention Form & History ──────────────────────────── */}
        <div id="intervention-form-section" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* New Intervention Log Form */}
          <div className="lg:col-span-1 bg-slate-800 border border-slate-700/80 rounded-2xl p-6 shadow-xl h-fit">
            <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-slate-700/60">
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
                <PlusCircle className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-100">Log New Intervention</h2>
            </div>

            <form onSubmit={handleLogIntervention} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Target Student</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-teal-500"
                >
                  {studentsList.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.userId?.name || 'Student'} ({s.rollNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Intervention Category</label>
                <select
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-teal-500 capitalize"
                >
                  <option value="academic">Academic Counseling</option>
                  <option value="attendance">Attendance Warning & Support</option>
                  <option value="psychological">Wellness & Stress Counseling</option>
                  <option value="career">Career & Skill Mentoring</option>
                  <option value="general">General Check-in</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300">Action Plan / Meeting Notes</label>
                  <span className="text-[10px] text-teal-400 cursor-pointer hover:underline" onClick={() => setActionInput('Conducted 1-on-1 performance review. Assigned peer study partner.')}>
                    Use Template
                  </span>
                </div>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Conducted 1-on-1 counseling session regarding attendance. Recommended remedial classes..."
                  value={actionInput}
                  onChange={(e) => setActionInput(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Status</label>
                  <select
                    value={statusInput}
                    onChange={(e) => setStatusInput(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-teal-500"
                  >
                    <option value="open">Open (Active)</option>
                    <option value="in-progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Follow-up Date</label>
                  <input
                    type="date"
                    value={followUpDateInput}
                    onChange={(e) => setFollowUpDateInput(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Outcome / Milestones (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Target 80% attendance in next 2 weeks"
                  value={outcomeInput}
                  onChange={(e) => setOutcomeInput(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Private Mentor Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Follow-up scheduled with course coordinator..."
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-teal-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-teal-600/20 transition-all flex items-center justify-center gap-2 mt-2"
              >
                {isSubmitting ? 'Logging...' : 'Log Intervention Entry'}
              </button>
            </form>
          </div>

          {/* Intervention Tracking History Table */}
          <div className="lg:col-span-2 bg-slate-800 border border-slate-700/80 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
                  <UserCheck className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-slate-100">Logged Interventions History</h2>
              </div>
              <span className="text-xs text-slate-400 font-medium">{interventionsList.length} Entries</span>
            </div>

            {loading ? (
              <LoadingSpinner text="Fetching intervention logs..." />
            ) : interventionsList.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-10">
                No interventions logged yet. Use the form to record your first action.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-700/80 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-3">Student</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">Action & Milestone</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Follow-up</th>
                      <th className="py-3 px-3 text-right">Update Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/40 text-sm">
                    {interventionsList.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-700/20 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-100">
                            {item.studentId?.userId?.name || 'Student'}
                          </div>
                          <div className="text-xs text-slate-400">{item.studentId?.rollNumber}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            {item.category || 'Academic'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="text-xs font-medium text-slate-200">{item.action}</div>
                          {item.outcome && (
                            <div className="text-[11px] text-teal-400 mt-0.5">🎯 {item.outcome}</div>
                          )}
                          {item.notes && <div className="text-[11px] text-slate-400 italic mt-0.5">{item.notes}</div>}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded capitalize ${
                              item.status === 'resolved'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : item.status === 'in-progress'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-400">
                          {item.followUpDate ? new Date(item.followUpDate).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <select
                            value={item.status}
                            onChange={(e) => handleStatusUpdate(item._id, e.target.value)}
                            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-teal-500"
                          >
                            <option value="open">Open</option>
                            <option value="in-progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Student Details Modal ────────────────────────────────────────────── */}
      {selectedStudentForModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-8 animate-fadeIn">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-700/80 flex items-start justify-between bg-slate-800/90">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-slate-100">
                    {selectedStudentForModal.userId?.name || 'Student Profile'}
                  </h3>
                  <RiskBadge level={selectedStudentForModal.overallRisk || 'low'} score={selectedStudentForModal.highestRiskScore} />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Roll: <span className="font-mono text-slate-200">{selectedStudentForModal.rollNumber}</span> · Department: {selectedStudentForModal.department} · Batch: {selectedStudentForModal.batch} · Sem {selectedStudentForModal.semester}
                </p>
              </div>
              <button
                onClick={() => setSelectedStudentForModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-700/50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
              {modalLoading ? (
                <LoadingSpinner text="Fetching student academic metrics..." />
              ) : (
                <>
                  {/* Academic Signal Snapshots */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-teal-400" />
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Attendance</span>
                      </div>
                      <p className="text-2xl font-bold text-teal-400">
                        {modalAttendanceStats?.attendancePercentage != null
                          ? `${modalAttendanceStats.attendancePercentage}%`
                          : 'N/A'}
                      </p>
                      <span className="text-[11px] text-slate-400 mt-1 block">
                        {modalAttendanceStats?.presentCount || 0} / {modalAttendanceStats?.totalRecords || 0} classes
                      </span>
                    </div>

                    <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/50">
                      <div className="flex items-center gap-2 mb-2">
                        <BookOpen className="w-4 h-4 text-indigo-400" />
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Marks</span>
                      </div>
                      <p className="text-2xl font-bold text-indigo-400">
                        {modalAssessmentStats?.avgPercentage != null
                          ? `${modalAssessmentStats.avgPercentage}%`
                          : 'N/A'}
                      </p>
                      <span className="text-[11px] text-slate-400 mt-1 block">
                        {modalAssessmentStats?.totalAssessments || 0} assessments recorded
                      </span>
                    </div>

                    <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">LMS Activity</span>
                      </div>
                      <p className="text-2xl font-bold text-amber-400">
                        {modalEngagementStats?.avgLoginCount != null
                          ? `${modalEngagementStats.avgLoginCount} logins/mo`
                          : 'N/A'}
                      </p>
                      <span className="text-[11px] text-slate-400 mt-1 block">
                        Delay: {modalEngagementStats?.avgSubmissionDelay || 0}h
                      </span>
                    </div>
                  </div>

                  {/* Warning Factors */}
                  {selectedStudentForModal.warningFactors?.length > 0 && (
                    <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <ShieldAlert className="w-4 h-4 text-rose-400" />
                        <span className="text-xs font-bold text-rose-300 uppercase tracking-wider">Active Warning Factors</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedStudentForModal.warningFactors.map((wf, idx) => (
                          <span
                            key={idx}
                            className="bg-rose-500/20 text-rose-200 border border-rose-500/40 text-xs px-2.5 py-1 rounded-lg font-medium"
                          >
                            {wf}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Subject-Wise Risk Breakdown */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-200 mb-3">Subject Risk Evaluations</h4>
                    {modalRiskData?.bySubject?.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {modalRiskData.bySubject.map((subj, idx) => (
                          <div key={idx} className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-3.5">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-semibold text-xs text-slate-200">{subj.subject}</span>
                              <RiskBadge level={subj.riskLevel} score={subj.score} />
                            </div>
                            <div className="text-[11px] text-slate-400">Score: {subj.score}/100</div>
                            {subj.factors?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {subj.factors.map((f, fIdx) => (
                                  <span
                                    key={fIdx}
                                    className="bg-slate-800 text-slate-300 text-[10px] px-1.5 py-0.5 rounded border border-slate-700"
                                  >
                                    {f}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 bg-slate-900/40 p-3 rounded-xl border border-slate-700/40">
                        No subject evaluation records computed yet.
                      </p>
                    )}
                  </div>

                  {/* Intervention History for this student */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold text-slate-200">Intervention Timeline for this Student</h4>
                      <button
                        onClick={() => handleSelectStudentForIntervention(selectedStudentForModal._id)}
                        className="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1"
                      >
                        Log New Action <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {interventionsList.filter(
                      (i) => i.studentId?._id === selectedStudentForModal._id || i.studentId === selectedStudentForModal._id
                    ).length === 0 ? (
                      <p className="text-xs text-slate-500 bg-slate-900/40 p-3 rounded-xl border border-slate-700/40">
                        No previous interventions logged for this student yet.
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {interventionsList
                          .filter(
                            (i) =>
                              i.studentId?._id === selectedStudentForModal._id ||
                              i.studentId === selectedStudentForModal._id
                          )
                          .map((item) => (
                            <div
                              key={item._id}
                              className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-3 flex items-start justify-between gap-3 text-xs"
                            >
                              <div>
                                <span className="font-semibold text-slate-200">{item.action}</span>
                                {item.notes && <p className="text-slate-400 italic mt-0.5">{item.notes}</p>}
                                <span className="text-[10px] text-slate-500 mt-1 block">
                                  {new Date(item.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize ${
                                  item.status === 'resolved'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                    : item.status === 'in-progress'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                }`}
                              >
                                {item.status}
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-700/80 bg-slate-800/90 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Early intervention helps prevent academic dropouts
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedStudentForModal(null)}
                  className="px-4 py-2 bg-slate-700/60 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-all"
                >
                  Close
                </button>
                <button
                  onClick={() => handleSelectStudentForIntervention(selectedStudentForModal._id)}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <MessageSquarePlus className="w-4 h-4" />
                  Log Intervention
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MentorDashboard;
