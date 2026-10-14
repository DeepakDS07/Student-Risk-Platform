import React, { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ErrorAlert from '../components/ErrorAlert';
import SuccessToast from '../components/SuccessToast';
import { User, Mail, Shield, Building, Key, LogOut } from 'lucide-react';

const ProfilePage = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulate/trigger password change
      setSuccess('Password updated successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError('Failed to update password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-900 pb-12">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Account Profile & Settings</h1>
            <p className="text-sm text-slate-400">View personal details and manage security preferences</p>
          </div>
        </div>

        <ErrorAlert message={error} onClose={() => setError('')} />
        <SuccessToast message={success} onClose={() => setSuccess('')} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* User Identity Details Card */}
          <div className="md:col-span-1 bg-slate-800 border border-slate-700/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex flex-col items-center text-center pb-6 border-b border-slate-700/60 mb-6">
                <div className="w-20 h-20 rounded-full bg-teal-500/10 border-2 border-teal-500/30 flex items-center justify-center text-teal-400 font-bold text-2xl mb-3 shadow-lg shadow-teal-500/5">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <h2 className="text-lg font-bold text-slate-100">{user?.name}</h2>
                <span className="text-xs font-semibold text-teal-400 uppercase tracking-widest bg-teal-500/10 px-2.5 py-1 rounded-full border border-teal-500/20 mt-1">
                  {user?.role}
                </span>
              </div>

              <div className="space-y-4 text-xs">
                <div className="flex items-center gap-3 text-slate-300">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate">{user?.email}</span>
                </div>

                <div className="flex items-center gap-3 text-slate-300">
                  <Building className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{user?.department || 'Department N/A'}</span>
                </div>

                <div className="flex items-center gap-3 text-slate-300">
                  <Shield className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="capitalize">Role: {user?.role}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full mt-8 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold text-xs rounded-xl border border-rose-500/30 transition-all flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out Account
            </button>
          </div>

          {/* Change Password Form */}
          <div className="md:col-span-2 bg-slate-800 border border-slate-700/80 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-slate-700/60">
              <Key className="w-5 h-5 text-teal-400" />
              <h2 className="text-lg font-bold text-slate-100">Change Password</h2>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-teal-600/20 transition-all"
                >
                  {isSubmitting ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
