import React, { useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { ShieldAlert, User, LogOut, LayoutDashboard, Sun, Moon } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getDashboardPath = () => {
    switch (user.role) {
      case 'admin': return '/admin/dashboard';
      case 'faculty': return '/faculty/dashboard';
      case 'mentor': return '/mentor/dashboard';
      case 'student': return '/student/dashboard';
      default: return '/login';
    }
  };

  const dashboardPath = getDashboardPath();
  const isDashboardActive = location.pathname === dashboardPath;
  const isProfileActive = location.pathname === '/profile';

  return (
    <nav className="bg-slate-800/90 backdrop-blur-md border-b border-slate-700/60 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link to={dashboardPath} className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 group-hover:scale-105 transition-transform">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-base text-slate-100 tracking-tight block leading-none">
                  Student Risk <span className="text-teal-400">Platform</span>
                </span>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                  Early Intervention
                </span>
              </div>
            </Link>

            {/* Nav Links */}
            <div className="hidden md:flex items-center gap-2 ml-8">
              <Link
                to={dashboardPath}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  isDashboardActive
                    ? 'bg-teal-500/10 text-teal-400 border border-teal-500/30'
                    : 'text-slate-300 hover:text-slate-100 hover:bg-slate-700/50'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>

              <Link
                to="/profile"
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  isProfileActive
                    ? 'bg-teal-500/10 text-teal-400 border border-teal-500/30'
                    : 'text-slate-300 hover:text-slate-100 hover:bg-slate-700/50'
                }`}
              >
                <User className="w-4 h-4" />
                Profile
              </Link>
            </div>
          </div>

          {/* Right User Info & Logout */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              className="p-2 text-amber-400 hover:text-amber-300 bg-slate-700/40 hover:bg-amber-500/10 border border-slate-600/50 hover:border-amber-500/30 rounded-lg transition-all flex items-center justify-center"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-indigo-500" />}
            </button>

            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-medium text-slate-200">{user.name}</span>
              <span className="text-[11px] font-semibold text-teal-400 uppercase tracking-wider bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                {user.role}
              </span>
            </div>

            <button
              onClick={handleLogout}
              title="Logout"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-300 hover:text-rose-400 bg-slate-700/40 hover:bg-rose-500/10 border border-slate-600/50 hover:border-rose-500/30 rounded-lg transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
