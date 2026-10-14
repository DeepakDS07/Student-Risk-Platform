import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import Navbar from '../components/Navbar';
import RiskBadge from '../components/RiskBadge';
import ErrorAlert from '../components/ErrorAlert';
import SuccessToast from '../components/SuccessToast';
import LoadingSpinner from '../components/LoadingSpinner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronRight, RefreshCw, UserCheck, Calendar, BookOpen, Clock, Activity, FileText, X } from 'lucide-react';

const FacultyStudentDetail = () => {
  const { studentId } = useParams();

  const [studentRiskData, setStudentRiskData] = useState(null);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [assessmentStats, setAssessmentStats] = useState(null);
  const [engagementStats, setEngagementStats] = useState(null);
  const [assessmentsList, setAssessmentsList] = useState([]);

  // Raw data modal state
  const [showModal, setShowModal] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchStudentFullDetail = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch Risk Scores
      try {
        const riskRes = await axiosInstance.get(`/risk/student/${studentId}`);
        if (riskRes.data && riskRes.data.success) {
          setStudentRiskData(riskRes.data.data);
        }
      } catch (err) {
        console.log('No risk score calculated yet');
      }

      // Fetch Attendance Stats
      try {
        const attRes = await axiosInstance.get(`/attendance/stats/student/${studentId}`);
        if (attRes.data && attRes.data.success) {
          setAttendanceStats(attRes.data.data);
        }
      } catch (err) { console.log('No attendance stats'); }

      // Fetch Assessment Stats & List
      try {
        const assStatsRes = await axiosInstance.get(`/assessment/stats/student/${studentId}`);
        if (assStatsRes.data && assStatsRes.data.success) {
          setAssessmentStats(assStatsRes.data.data);
        }

        const assListRes = await axiosInstance.get(`/assessment/student/${studentId}`);
        if (assListRes.data && assListRes.data.success) {
          setAssessmentsList(assListRes.data.data.records);
        }
      } catch (err) { console.log('No assessment stats'); }

      // Fetch Engagement Stats
      try {
        const engRes = await axiosInstance.get(`/engagement/stats/student/${studentId}`);
        if (engRes.data && engRes.data.success) {
          setEngagementStats(engRes.data.data);
        }
      } catch (err) { console.log('No engagement stats'); }

    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load student metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentFullDetail();
  }, [studentId]);

  const handleRecompute = async (subject = 'Mathematics') => {
    setRecomputing(true);
    setError('');
    setSuccess('');

    try {
      const res = await axiosInstance.post('/risk/compute', {
        studentId,
        subject
      });
      if (res.data && res.data.success) {
        setSuccess(`Risk score recomputed for ${subject}: ${res.data.data.score} (${res.data.data.riskLevel.toUpperCase()})`);
        fetchStudentFullDetail();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Recomputation failed: Insufficient data (< 3 records)');
    } finally {
      setRecomputing(false);
    }
  };

  const handleFetchRawModal = async () => {
    setShowModal(true);
    try {
      const attListRes = await axiosInstance.get(`/attendance/student/${studentId}`);
      if (attListRes.data && attListRes.data.success) {
        setAttendanceRecords(attListRes.data.data.records);
      }
    } catch (err) { console.log('Failed to fetch raw modal data'); }
  };

  // Recharts Trend Data Transformation
  const trendChartData = assessmentsList
    .slice()
    .reverse()
    .map((a) => ({
      date: new Date(a.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      score: Number(((a.marksObtained / a.maxMarks) * 100).toFixed(1)),
      subject: a.subject
    }));

  return (
    <div className="min-h-screen bg-slate-900 pb-12">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-6">
          <Link to="/faculty/dashboard" className="hover:text-teal-400 transition-colors">
            Faculty Dashboard
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span>Student Detail View</span>
        </div>

        <ErrorAlert message={error} onClose={() => setError('')} />
        <SuccessToast message={success} onClose={() => setSuccess('')} />

        {loading ? (
          <LoadingSpinner text="Fetching student risk profile..." />
        ) : (
          <>
            {/* Header Card */}
            <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-6 shadow-xl mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 font-bold text-xl">
                  <UserCheck className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-100">Student Profile Analysis</h1>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {studentId}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall Risk Status</span>
                  <div className="mt-1 flex items-center gap-2">
                    <RiskBadge level={studentRiskData?.overallRisk || 'low'} />
                  </div>
                </div>

                <button
                  onClick={() => handleRecompute()}
                  disabled={recomputing}
                  className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-teal-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${recomputing ? 'animate-spin' : ''}`} />
                  {recomputing ? 'Computing...' : 'Recompute Risk'}
                </button>

                <button
                  onClick={handleFetchRawModal}
                  className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-xs rounded-xl transition-all flex items-center gap-2 border border-slate-600"
                >
                  <FileText className="w-4 h-4" />
                  Raw Records
                </button>
              </div>
            </div>

            {/* Risk by Subject Table */}
            <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-6 shadow-xl mb-8">
              <h2 className="text-lg font-bold text-slate-100 mb-4">Risk Breakdown by Subject</h2>
              {!studentRiskData?.bySubject || studentRiskData.bySubject.length === 0 ? (
                <p className="text-sm text-slate-400 py-4">No risk scores calculated yet for subjects. Click "Recompute Risk" to compute.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-700/80 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        <th className="py-3 px-4">Subject</th>
                        <th className="py-3 px-4">Risk Score</th>
                        <th className="py-3 px-4">Risk Level</th>
                        <th className="py-3 px-4">Contributing Factors</th>
                        <th className="py-3 px-4">Last Calculated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/40 text-sm">
                      {studentRiskData.bySubject.map((s, idx) => (
                        <tr key={idx} className="hover:bg-slate-700/20">
                          <td className="py-3.5 px-4 font-semibold text-slate-100">{s.subject}</td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-200">{s.score}/100</td>
                          <td className="py-3.5 px-4">
                            <RiskBadge level={s.riskLevel} />
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-300">
                            {s.factors && s.factors.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {s.factors.map((f, fIdx) => (
                                  <span key={fIdx} className="bg-rose-500/10 text-rose-300 border border-rose-500/20 px-2 py-0.5 rounded text-[11px]">
                                    {f}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-emerald-400 font-medium">None (Optimal)</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-400">
                            {new Date(s.computedAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 3 Analytics Summary Widgets */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              {/* Attendance Widget */}
              <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-5 h-5 text-teal-400" />
                    <h3 className="text-base font-bold text-slate-100">Attendance Ratio</h3>
                  </div>

                  <div className="flex flex-col items-center py-4">
                    <div className="w-28 h-28 rounded-full border-4 border-teal-500/30 flex items-center justify-center bg-teal-500/5 relative">
                      <span className="text-3xl font-extrabold text-teal-400">
                        {attendanceStats?.attendancePercentage || 0}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-700/60 text-xs text-slate-300 text-center">
                  Present: <span className="font-bold text-emerald-400">{attendanceStats?.presentCount || 0}</span> |
                  Absent: <span className="font-bold text-rose-400">{attendanceStats?.absentCount || 0}</span> |
                  Total: <span className="font-bold text-slate-100">{attendanceStats?.totalRecords || 0}</span>
                </div>
              </div>

              {/* Assessment Marks Line Chart */}
              <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-base font-bold text-slate-100">Marks Performance Trend</h3>
                  </div>

                  {trendChartData.length === 0 ? (
                    <p className="text-xs text-slate-400 py-8 text-center">No assessment test records logged yet.</p>
                  ) : (
                    <div className="w-full h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                          <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={10} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                            itemStyle={{ color: '#818cf8' }}
                          />
                          <Line type="monotone" dataKey="score" stroke="#818cf8" strokeWidth={2.5} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-700/60 text-xs text-slate-300 text-center">
                  Average Marks: <span className="font-bold text-indigo-400">{assessmentStats?.averageMarks || 0}%</span>
                </div>
              </div>

              {/* Engagement Widget */}
              <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-5 h-5 text-amber-400" />
                    <h3 className="text-base font-bold text-slate-100">LMS Activity Signals</h3>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-slate-900/60 p-3 rounded-xl flex items-center justify-between border border-slate-700/50">
                      <span className="text-xs text-slate-400">Monthly Logins</span>
                      <span className="text-sm font-bold text-slate-100">{engagementStats?.avgLoginCount || 0}</span>
                    </div>

                    <div className="bg-slate-900/60 p-3 rounded-xl flex items-center justify-between border border-slate-700/50">
                      <span className="text-xs text-slate-400">Submission Delay</span>
                      <span className="text-sm font-bold text-amber-400">{engagementStats?.avgSubmissionDelay || 0} hrs</span>
                    </div>

                    <div className="bg-slate-900/60 p-3 rounded-xl flex items-center justify-between border border-slate-700/50">
                      <span className="text-xs text-slate-400">Participation Score</span>
                      <span className="text-sm font-bold text-emerald-400">{engagementStats?.avgParticipationScore || 0}/100</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-700/60 text-xs text-slate-300 text-center">
                  Activity Trend: <span className="font-bold text-amber-400 uppercase">{engagementStats?.trend || 'Stable'}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Modal for Raw Records Log */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-slate-700/60 mb-4">
                <h3 className="text-lg font-bold text-slate-100">Raw Data Audit Logs</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Attendance Records ({attendanceRecords.length})</h4>
              <div className="space-y-2 mb-6">
                {attendanceRecords.slice(0, 5).map((a, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded-xl text-xs">
                    <span className="text-slate-300">{a.subject}</span>
                    <span className="text-slate-400">{new Date(a.date).toLocaleDateString()}</span>
                    <span className={`font-semibold capitalize ${a.status === 'present' ? 'text-emerald-400' : 'text-rose-400'}`}>{a.status}</span>
                  </div>
                ))}
              </div>

              <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">Assessment Marks Records ({assessmentsList.length})</h4>
              <div className="space-y-2">
                {assessmentsList.slice(0, 5).map((a, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded-xl text-xs">
                    <span className="text-slate-300">{a.subject} ({a.type})</span>
                    <span className="text-slate-400">{new Date(a.date).toLocaleDateString()}</span>
                    <span className="font-bold text-indigo-400">{a.marksObtained}/{a.maxMarks}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default FacultyStudentDetail;
