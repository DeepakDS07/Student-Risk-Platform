import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import Navbar from '../components/Navbar';
import RiskBadge from '../components/RiskBadge';
import ErrorAlert from '../components/ErrorAlert';
import LoadingSpinner from '../components/LoadingSpinner';
import { ShieldCheck, BookOpen, Calendar, Activity, Info, ChevronDown, ChevronUp, UserCheck, Mail, Sparkles, AlertTriangle, CheckCircle } from 'lucide-react';

const StudentDashboard = () => {
  const { user } = useContext(AuthContext);

  const [studentProfile, setStudentProfile] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [assessmentStats, setAssessmentStats] = useState(null);
  const [assessmentsList, setAssessmentsList] = useState([]);
  const [engagementStats, setEngagementStats] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    const fetchStudentOwnData = async () => {
      try {
        setLoading(true);
        setError('');

        const currentUserId = user?._id || user?.id;

        // Find linked Student profile ObjectId for logged in user
        const studentsRes = await axiosInstance.get('/users/students');
        if (studentsRes.data && studentsRes.data.success) {
          const myStudentObj = studentsRes.data.data.find(
            (s) => s.userId && (s.userId._id === currentUserId || s.userId === currentUserId || s.userId.id === currentUserId)
          );

          if (myStudentObj) {
            setStudentProfile(myStudentObj);
            const sId = myStudentObj._id;

            // Fetch Risk Scores
            try {
              const rRes = await axiosInstance.get(`/risk/student/${sId}`);
              if (rRes.data && rRes.data.success) setRiskData(rRes.data.data);
            } catch (err) { console.log('No risk score computed'); }

            // Fetch Attendance Stats
            try {
              const attRes = await axiosInstance.get(`/attendance/stats/student/${sId}`);
              if (attRes.data && attRes.data.success) setAttendanceStats(attRes.data.data);
            } catch (err) { console.log('No attendance stats'); }

            // Fetch Assessments
            try {
              const assStatsRes = await axiosInstance.get(`/assessment/stats/student/${sId}`);
              if (assStatsRes.data && assStatsRes.data.success) setAssessmentStats(assStatsRes.data.data);

              const assListRes = await axiosInstance.get(`/assessment/student/${sId}`);
              if (assListRes.data && assListRes.data.success) setAssessmentsList(assListRes.data.data.records);
            } catch (err) { console.log('No assessment stats'); }

            // Fetch Engagement Stats
            try {
              const engRes = await axiosInstance.get(`/engagement/stats/student/${sId}`);
              if (engRes.data && engRes.data.success) setEngagementStats(engRes.data.data);
            } catch (err) { console.log('No engagement stats'); }
          }
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to load student data');
      } finally {
        setLoading(false);
      }
    };

    if (user?._id || user?.id) {
      fetchStudentOwnData();
    }
  }, [user]);

  const overallRisk = riskData?.overallRisk || 'low';
  const getInterpretation = (risk) => {
    switch (risk) {
      case 'high':
        return 'Your academic risk level is HIGH. Please schedule a meeting with your mentor to discuss attendance and tutoring resources.';
      case 'medium':
        return 'Your risk level is MODERATE. Review your attendance and recent assessment scores below to stay on track.';
      case 'low':
      default:
        return 'Your academic standing is OPTIMAL. Maintain your current attendance and assignment submission momentum!';
    }
  };

  const mentor = studentProfile?.assignedMentorId;

  return (
    <div className="min-h-screen bg-slate-900 pb-12">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Welcome, {user?.name}</h1>
            <p className="text-sm text-slate-400">Personal Academic Risk & Signal Tracking Dashboard</p>
          </div>
        </div>

        <ErrorAlert message={error} onClose={() => setError('')} />

        {loading ? (
          <LoadingSpinner text="Fetching your academic dashboard..." />
        ) : (
          <>
            {/* Top Row: Overall Risk & Mentor Contact Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Overall Risk Card */}
              <div className="lg:col-span-2 bg-slate-800 border border-slate-700/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-teal-400" />
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Your Overall Status</span>
                    </div>
                    <button
                      onClick={() => setShowExplanation(!showExplanation)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700/60 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-all border border-slate-600/50"
                    >
                      <Info className="w-3.5 h-3.5 text-teal-400" />
                      Calculation Info
                      {showExplanation ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <RiskBadge level={overallRisk} />
                    <span className="text-sm text-slate-300 font-medium leading-relaxed">{getInterpretation(overallRisk)}</span>
                  </div>
                </div>

                {/* Collapsible Formula Explanation */}
                {showExplanation && (
                  <div className="mt-5 pt-4 border-t border-slate-700/60 text-xs text-slate-300 bg-slate-900/50 p-4 rounded-xl space-y-2 border border-slate-700/50 animate-fadeIn">
                    <p className="font-semibold text-teal-400">Weighted Risk Calculation Rule:</p>
                    <ul className="list-disc pl-5 space-y-1 text-slate-400">
                      <li><strong className="text-slate-200">Attendance (25% Weight):</strong> Presence in class is foundational for success.</li>
                      <li><strong className="text-slate-200">Assessment Average (35% Weight):</strong> Exam & assignment scores reflect academic performance.</li>
                      <li><strong className="text-slate-200">Marks Trend (15% Weight):</strong> Declining trends trigger early warning signals.</li>
                      <li><strong className="text-slate-200">LMS Engagement (25% Weight):</strong> Logins and on-time submissions show active effort.</li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Assigned Faculty Mentor Card */}
              <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-100">Assigned Mentor</h3>
                      <p className="text-[11px] text-slate-400">Your dedicated faculty counselor</p>
                    </div>
                  </div>

                  {mentor ? (
                    <div className="mt-3 space-y-2">
                      <div className="font-semibold text-slate-100 text-base">{mentor.name}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <span>{mentor.email}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-2">
                        Reach out anytime for academic advice, attendance concerns, or study roadmaps.
                      </p>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 mt-3">
                      No mentor assigned yet. Contact your department administrator.
                    </div>
                  )}
                </div>

                {mentor && (
                  <a
                    href={`mailto:${mentor.email}?subject=Student Guidance Request - ${user?.name}`}
                    className="mt-4 w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-center"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Contact Mentor via Email
                  </a>
                )}
              </div>
            </div>

            {/* Smart Actionable Recommendations Section */}
            <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-6 shadow-xl mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-slate-100">Personalized Improvement Recommendations</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Attendance Recommendation */}
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-semibold text-teal-400 uppercase tracking-wider block mb-1">
                      Attendance Goal
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {(attendanceStats?.attendancePercentage || 0) < 75 ? (
                        <>
                          Your attendance is currently <strong className="text-rose-400">{attendanceStats?.attendancePercentage || 0}%</strong>. Attending the next consecutive lectures will bring you back into the safe zone (&gt;75%).
                        </>
                      ) : (
                        <>
                          Your attendance is in good standing at <strong className="text-emerald-400">{attendanceStats?.attendancePercentage || 0}%</strong>. Keep up this consistency throughout the semester!
                        </>
                      )}
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
                    Threshold: 75% for exam eligibility
                  </div>
                </div>

                {/* Assessment Recommendation */}
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider block mb-1">
                      Academic Focus
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {(assessmentStats?.avgPercentage || 0) < 60 ? (
                        <>
                          Average test marks are at <strong className="text-amber-400">{assessmentStats?.avgPercentage || 0}%</strong>. Review previous internal exam feedback and attend department doubt sessions.
                        </>
                      ) : (
                        <>
                          Solid academic score average at <strong className="text-emerald-400">{assessmentStats?.avgPercentage || 0}%</strong>. Prepare ahead for the upcoming semester finals.
                        </>
                      )}
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
                    Target: &ge;65% for semester distinction
                  </div>
                </div>

                {/* LMS Engagement Recommendation */}
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider block mb-1">
                      LMS Engagement
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {(engagementStats?.avgSubmissionDelay || 0) > 10 ? (
                        <>
                          Average assignment delay is <strong className="text-rose-400">{engagementStats?.avgSubmissionDelay}h</strong>. Aim to submit coursework at least 12 hours before deadlines.
                        </>
                      ) : (
                        <>
                          Timely submission pace observed! Consistent portal activity keeps your participation score optimal.
                        </>
                      )}
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
                    Participation: {engagementStats?.avgParticipationScore || 0}/100
                  </div>
                </div>
              </div>
            </div>

            {/* Risk by Subject */}
            <div className="mb-8">
              <h2 className="text-lg font-bold text-slate-100 mb-4">Risk Breakdown by Subject</h2>
              {!riskData?.bySubject || riskData.bySubject.length === 0 ? (
                <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-6 text-sm text-slate-400">
                  Your risk score will appear here once your faculty computes evaluations.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {riskData.bySubject.map((s, idx) => (
                    <div key={idx} className="bg-slate-800 border border-slate-700/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-bold text-base text-slate-100">{s.subject}</h3>
                          <RiskBadge level={s.riskLevel} score={s.score} />
                        </div>
                        <p className="text-xs text-slate-400">
                          Risk Score: <span className="font-bold text-slate-200">{s.score}/100</span>
                        </p>
                      </div>

                      {s.factors && s.factors.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-slate-700/60">
                          <span className="text-[11px] text-slate-400 font-semibold uppercase block mb-1">Warning Factors:</span>
                          <div className="flex flex-wrap gap-1">
                            {s.factors.map((f, fIdx) => (
                              <span key={fIdx} className="bg-rose-500/10 text-rose-300 border border-rose-500/20 text-[10px] px-2 py-0.5 rounded">
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Attendance & Marks Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              {/* Attendance Card */}
              <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-5 h-5 text-teal-400" />
                    <h3 className="text-base font-bold text-slate-100">Attendance Percentage</h3>
                  </div>

                  <div className="flex flex-col items-center py-4">
                    <div className="w-28 h-28 rounded-full border-4 border-teal-500/30 flex items-center justify-center bg-teal-500/5">
                      <span className="text-3xl font-extrabold text-teal-400">
                        {attendanceStats?.attendancePercentage || 0}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-700/60 text-xs text-slate-300 text-center">
                  Attended: <span className="font-bold text-emerald-400">{attendanceStats?.presentCount || 0}</span> / {attendanceStats?.totalRecords || 0} Total Classes
                </div>
              </div>

              {/* Assessment Marks List */}
              <div className="lg:col-span-2 bg-slate-800 border border-slate-700/80 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-700/60">
                  <BookOpen className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-base font-bold text-slate-100">Recent Assessments History</h3>
                </div>

                {assessmentsList.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No assessments recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-700/80 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          <th className="py-2.5 px-3">Subject</th>
                          <th className="py-2.5 px-3">Type</th>
                          <th className="py-2.5 px-3">Marks</th>
                          <th className="py-2.5 px-3">Percentage</th>
                          <th className="py-2.5 px-3">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/40 text-xs">
                        {assessmentsList.slice(0, 5).map((a) => {
                          const pct = Number(((a.marksObtained / a.maxMarks) * 100).toFixed(1));
                          return (
                            <tr key={a._id} className="hover:bg-slate-700/20">
                              <td className="py-2.5 px-3 font-semibold text-slate-200">{a.subject}</td>
                              <td className="py-2.5 px-3 capitalize text-slate-400">{a.type}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-100">{a.marksObtained} / {a.maxMarks}</td>
                              <td className="py-2.5 px-3">
                                <span className={`font-semibold ${pct >= 70 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                                  {pct}%
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-400">{new Date(a.date).toLocaleDateString()}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Engagement Snapshot */}
            <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-700/60">
                <Activity className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-slate-100">LMS Engagement Snapshot</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/50">
                  <span className="text-xs text-slate-400 font-medium">Monthly Logins</span>
                  <p className="text-2xl font-bold text-slate-100 mt-1">{engagementStats?.avgLoginCount || 0}</p>
                </div>

                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/50">
                  <span className="text-xs text-slate-400 font-medium">Avg Submission Delay</span>
                  <p className="text-2xl font-bold text-amber-400 mt-1">{engagementStats?.avgSubmissionDelay || 0} hrs</p>
                </div>

                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/50">
                  <span className="text-xs text-slate-400 font-medium">Participation Score</span>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">{engagementStats?.avgParticipationScore || 0}/100</p>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default StudentDashboard;
