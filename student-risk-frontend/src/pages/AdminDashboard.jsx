import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import Navbar from '../components/Navbar';
import ErrorAlert from '../components/ErrorAlert';
import SuccessToast from '../components/SuccessToast';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  UserPlus,
  Users,
  ShieldCheck,
  Activity,
  Sliders,
  ToggleLeft,
  ToggleRight,
  Check,
  Search,
  Download,
  Filter,
  UserCheck
} from 'lucide-react';

const AdminDashboard = () => {
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [department, setDepartment] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [semester, setSemester] = useState('1');
  const [batch, setBatch] = useState(String(new Date().getFullYear()));
  const [assignedMentorId, setAssignedMentorId] = useState('');

  // UI State
  const [usersList, setUsersList] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Threshold Settings State
  const [lowThreshold, setLowThreshold] = useState(30);
  const [medThreshold, setMedThreshold] = useState(60);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const fetchData = async () => {
    try {
      setLoadingUsers(true);
      const [usersRes, studentsRes] = await Promise.allSettled([
        axiosInstance.get('/users'),
        axiosInstance.get('/users/students')
      ]);

      if (usersRes.status === 'fulfilled' && usersRes.value.data?.success) {
        setUsersList(usersRes.value.data.data);
      }
      if (studentsRes.status === 'fulfilled' && studentsRes.value.data?.success) {
        setStudentsList(studentsRes.value.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const mentorsAndFaculty = usersList.filter(
    (u) => (u.role === 'mentor' || u.role === 'faculty') && u.isActive !== false
  );

  const filteredUsers = usersList.filter((u) => {
    // Role filter
    if (roleFilter !== 'all' && u.role !== roleFilter) {
      return false;
    }

    // Search query filter
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q) ||
      (u.department && u.department.toLowerCase().includes(q))
    );
  });

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const res = await axiosInstance.post('/auth/create-user', {
        name,
        email,
        password,
        role,
        department,
        ...(role === 'student' && {
          rollNumber: rollNumber.trim() || undefined,
          batch: batch.trim() || undefined,
          semester: Number(semester) || 1,
          assignedMentorId: assignedMentorId || undefined
        })
      });

      if (res.data && res.data.success) {
        setSuccess(`Account successfully created for ${email}`);
        setName('');
        setEmail('');
        setPassword('');
        setDepartment('');
        setRole('student');
        setRollNumber('');
        setSemester('1');
        setBatch(String(new Date().getFullYear()));
        setAssignedMentorId('');
        fetchData();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      const res = await axiosInstance.put(`/users/${userId}/status`, {
        isActive: !currentStatus
      });
      if (res.data && res.data.success) {
        setUsersList((prev) =>
          prev.map((u) => (u._id === userId ? { ...u, isActive: !currentStatus } : u))
        );
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleAssignMentor = async (studentProfileId, newMentorId) => {
    try {
      const res = await axiosInstance.put(`/users/students/${studentProfileId}/mentor`, {
        mentorId: newMentorId || undefined
      });
      if (res.data && res.data.success) {
        setSuccess('Mentor successfully assigned!');
        setStudentsList((prev) =>
          prev.map((s) => (s._id === studentProfileId ? res.data.data : s))
        );
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to assign mentor');
    }
  };

  const handleExportUsersCSV = () => {
    if (filteredUsers.length === 0) return;
    const headers = ['User ID', 'Name', 'Email', 'Role', 'Department', 'Status'];
    const rows = filteredUsers.map((u) => [
      `"${u._id}"`,
      `"${u.name}"`,
      `"${u.email}"`,
      `"${u.role.toUpperCase()}"`,
      `"${u.department || 'N/A'}"`,
      `"${u.isActive !== false ? 'Active' : 'Disabled'}"`
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `User_Accounts_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalUsers = usersList.length;
  const totalStudents = usersList.filter((u) => u.role === 'student').length;
  const activeCount = usersList.filter((u) => u.isActive !== false).length;

  return (
    <div className="min-h-screen bg-slate-900 pb-12">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Admin Control Center</h1>
            <p className="text-sm text-slate-400">Manage user accounts, assign mentors, and configure system thresholds</p>
          </div>
        </div>

        <ErrorAlert message={error} onClose={() => setError('')} />
        <SuccessToast message={success} onClose={() => setSuccess('')} />

        {/* System Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Users</span>
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-100 mt-3">{totalUsers}</p>
          </div>

          <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Students</span>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-100 mt-3">{totalStudents}</p>
          </div>

          <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Accounts</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <UserPlus className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-100 mt-3">{activeCount}</p>
          </div>

          <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">System Status</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Activity className="w-5 h-5" />
              </div>
            </div>
            <p className="text-sm font-semibold text-emerald-400 mt-4 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Operational
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create User Form */}
          <div className="lg:col-span-1 bg-slate-800 border border-slate-700/80 rounded-2xl p-6 shadow-xl h-fit">
            <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-slate-700/60">
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
                <UserPlus className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-100">Create New Account</h2>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Dr. Jane Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="jane.smith@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-teal-500"
                >
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                  <option value="mentor">Mentor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Department (Optional)</label>
                <input
                  type="text"
                  placeholder="Computer Science"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500"
                />
              </div>

              {role === 'student' && (
                <div className="pt-3 border-t border-slate-700/60 space-y-3">
                  <div className="text-xs font-semibold text-teal-400">Student Profile Information</div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Roll Number (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. CS2024010 (auto-generated if empty)"
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Semester</label>
                      <input
                        type="number"
                        min="1"
                        max="8"
                        value={semester}
                        onChange={(e) => setSemester(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Batch Year</label>
                      <input
                        type="text"
                        placeholder="2024"
                        value={batch}
                        onChange={(e) => setBatch(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Assign Initial Mentor (Optional)</label>
                    <select
                      value={assignedMentorId}
                      onChange={(e) => setAssignedMentorId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-teal-500"
                    >
                      <option value="">No Mentor (Assign Later)</option>
                      {mentorsAndFaculty.map((m) => (
                        <option key={m._id} value={m._id}>
                          {m.name} ({m.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-teal-600/20 transition-all flex items-center justify-center gap-2 mt-4"
              >
                {isSubmitting ? 'Creating...' : 'Create Account'}
              </button>
            </form>
          </div>

          {/* User Management Table */}
          <div className="lg:col-span-2 bg-slate-800 border border-slate-700/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 pb-4 border-b border-slate-700/60 gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
                    <Users className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-100">User Accounts Directory</h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportUsersCSV}
                    title="Export directory as CSV"
                    className="px-3 py-1.5 bg-slate-700/60 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 border border-slate-600/50"
                  >
                    <Download className="w-3.5 h-3.5 text-teal-400" />
                    Export CSV
                  </button>
                  <span className="text-xs text-slate-400 font-medium">
                    {filteredUsers.length} of {usersList.length} Accounts
                  </span>
                </div>
              </div>

              {/* Role Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3">
                {['all', 'student', 'faculty', 'mentor', 'admin'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRoleFilter(r)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-all border ${
                      roleFilter === r
                        ? 'bg-teal-600 text-white border-teal-500 shadow-sm'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {r === 'all' ? 'All Roles' : `${r}s`}
                  </button>
                ))}
              </div>

              {/* Search for Account Bar */}
              <div className="mb-5 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search for account by name, email, role, or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-teal-500 transition-all"
                />
              </div>

              {loadingUsers ? (
                <LoadingSpinner text="Loading user accounts..." />
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  No accounts found matching "<span className="text-slate-200">{searchQuery}</span>"
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-700/80 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        <th className="py-3 px-3">User</th>
                        <th className="py-3 px-3">Role</th>
                        <th className="py-3 px-3">Department</th>
                        <th className="py-3 px-3">Assigned Mentor</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/40 text-sm">
                      {filteredUsers.map((u) => {
                        const studentObj = studentsList.find(
                          (s) => (s.userId?._id || s.userId) === u._id
                        );

                        return (
                          <tr key={u._id} className="hover:bg-slate-700/20 transition-colors">
                            <td className="py-3 px-3">
                              <div className="font-medium text-slate-100">{u.name}</div>
                              <div className="text-xs text-slate-400">{u.email}</div>
                              {studentObj?.rollNumber && (
                                <div className="text-[11px] font-mono text-teal-400 mt-0.5">
                                  {studentObj.rollNumber} {studentObj.batch ? `(${studentObj.batch})` : ''}
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-3">
                              <span
                                className={`capitalize text-xs font-semibold px-2 py-0.5 rounded ${
                                  u.role === 'admin'
                                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                                    : u.role === 'mentor'
                                    ? 'bg-teal-500/10 text-teal-400 border border-teal-500/30'
                                    : u.role === 'faculty'
                                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                                    : 'bg-slate-700 text-slate-300'
                                }`}
                              >
                                {u.role}
                              </span>
                            </td>

                            <td className="py-3 px-3 text-xs text-slate-300">{u.department || 'N/A'}</td>

                            {/* Assigned Mentor column (for all students) */}
                            <td className="py-3 px-3">
                              {u.role === 'student' ? (
                                <select
                                  value={studentObj?.assignedMentorId?._id || studentObj?.assignedMentorId || ''}
                                  onChange={(e) => handleAssignMentor(studentObj ? studentObj._id : u._id, e.target.value)}
                                  className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-teal-500 max-w-[140px]"
                                >
                                  <option value="">No Mentor</option>
                                  {mentorsAndFaculty.map((m) => (
                                    <option key={m._id} value={m._id}>
                                      {m.name} ({m.role})
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-xs text-slate-500">-</span>
                              )}
                            </td>

                            <td className="py-3 px-3">
                              <span
                                className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded ${
                                  u.isActive !== false
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                }`}
                              >
                                {u.isActive !== false ? 'Active' : 'Disabled'}
                              </span>
                            </td>

                            <td className="py-3 px-3 text-right">
                              <button
                                onClick={() => handleToggleStatus(u._id, u.isActive !== false)}
                                title="Toggle account status"
                                className="text-xs font-medium text-slate-400 hover:text-teal-400 transition-colors inline-flex items-center gap-1"
                              >
                                {u.isActive !== false ? (
                                  <ToggleRight className="w-5 h-5 text-emerald-400" />
                                ) : (
                                  <ToggleLeft className="w-5 h-5 text-slate-500" />
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Risk Threshold Sliders Card */}
            <div className="mt-8 pt-6 border-t border-slate-700/60 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-teal-400" />
                  <h3 className="text-sm font-bold text-slate-200">Risk Threshold Settings</h3>
                </div>
                <button
                  onClick={() => {
                    setSettingsSaved(true);
                    setTimeout(() => setSettingsSaved(false), 3000);
                  }}
                  className="px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
                >
                  {settingsSaved ? <Check className="w-3.5 h-3.5" /> : null}
                  {settingsSaved ? 'Saved!' : 'Save Settings'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">
                    Medium Risk Threshold (<span className="text-amber-400 font-semibold">{lowThreshold}</span>)
                  </label>
                  <input
                    type="range"
                    min="15"
                    max="45"
                    value={lowThreshold}
                    onChange={(e) => setLowThreshold(Number(e.target.value))}
                    className="w-full accent-teal-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">
                    High Risk Threshold (<span className="text-rose-400 font-semibold">{medThreshold}</span>)
                  </label>
                  <input
                    type="range"
                    min="46"
                    max="80"
                    value={medThreshold}
                    onChange={(e) => setMedThreshold(Number(e.target.value))}
                    className="w-full accent-teal-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
