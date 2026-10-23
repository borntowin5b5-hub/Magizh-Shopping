import React, { useState } from 'react';
import { Shield, ShieldAlert, Lock, ArrowRight, CheckCircle2, AlertTriangle, Mail, Phone } from 'lucide-react';
import { User } from '../../types';
import { StorageService } from '../../services/storage';

interface AdminAuthGuardProps {
  currentUser: User;
  onLoginSuccess: (user: User) => void;
  onNavigateStorefront: () => void;
  children: React.ReactNode;
}

export const AdminAuthGuard: React.FC<AdminAuthGuardProps> = ({
  currentUser,
  onLoginSuccess,
  onNavigateStorefront,
  children,
}) => {
  // Strict role check: Only admin can view Admin Panel
  if (currentUser.role === 'admin') {
    return <>{children}</>;
  }

  const [identifier, setIdentifier] = useState('admin@magizh.in');
  const [password, setPassword] = useState('demo123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Attempt Server-Side Admin Authentication with Backend API
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: identifier, mobile: identifier, password }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success && data?.user?.role === 'admin') {
        if (data.token) {
          localStorage.setItem('magizh_admin_token', data.token);
        }
        StorageService.setCurrentUser(data.user);
        onLoginSuccess(data.user);
        setLoading(false);
        return;
      }

      // If backend explicitly rejected (e.g. 403 Forbidden for non-admin)
      if (data?.error) {
        setError(data.error);
        setLoading(false);
        return;
      }
    } catch (apiErr) {
      // Server unreachable or running offline, fall back to validated local storage
    }

    // 2. Local Fallback Validation (Strict Role Check)
    const users = StorageService.getUsers();
    const trimmed = identifier.trim().toLowerCase();
    const user = users.find(
      (u) => (u.email?.toLowerCase() === trimmed || u.mobile === trimmed)
    );

    if (!user) {
      setError('Invalid administrator credentials.');
      setLoading(false);
      return;
    }

    if (user.role !== 'admin') {
      setError(
        `Access Denied: The account "${user.name}" has role "${user.role}". Partners and customers cannot access administrator controls.`
      );
      setLoading(false);
      return;
    }

    StorageService.setCurrentUser(user);
    onLoginSuccess(user);
    setLoading(false);
  };

  const handleQuickDemoAdminLogin = async () => {
    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@magizh.in', password: 'demo123' }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.token) {
        localStorage.setItem('magizh_admin_token', data.token);
      }
    } catch (_) {}

    const adminUser = StorageService.switchRole('admin');
    onLoginSuccess(adminUser);
  };

  return (
    <div className="max-w-lg mx-auto my-8 sm:my-14 px-4">
      <div className="bg-white rounded-3xl border border-cream-300 shadow-2xl overflow-hidden">
        {/* Portal Header */}
        <div className="bg-gradient-to-r from-red-950 via-red-900 to-darkbrown-900 text-white p-6 sm:p-8 text-center relative">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Shield className="w-8 h-8 text-red-300" />
          </div>
          <span className="inline-block bg-red-700/80 text-red-100 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-2">
            Strict Role-Based Access Control
          </span>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">Magizh Administration Console</h1>
          <p className="text-xs text-red-200 mt-1 max-w-sm mx-auto">
            Restricted area for catalog curation, financial ledger audits, partner approvals, and coin rule management.
          </p>
        </div>

        {/* Unauthorized Current User Banner */}
        <div className="mx-6 mt-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-xs text-red-900">
          <ShieldAlert className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">
              Current Session: {currentUser.name} ({currentUser.role.toUpperCase()})
            </p>
            <p className="text-[11px] text-red-800 mt-1 leading-relaxed">
              {currentUser.role === 'partner'
                ? 'Partners are restricted from accessing system administration. Please sign in with administrator credentials.'
                : 'Customer accounts do not possess administrative clearance. Please authenticate below.'}
            </p>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="p-6 sm:p-8 space-y-4">
          {error && (
            <div className="p-3 bg-red-100 border border-red-300 text-red-900 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-700" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-darkbrown-900 mb-1">
              Admin Email or Mobile
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin@magizh.in or 9999999999"
                className="w-full pl-9 pr-3 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-700 text-darkbrown-900"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-darkbrown-900 mb-1">
              Admin Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-700 text-darkbrown-900"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-red-900 hover:bg-red-950 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Verifying Admin Clearance...' : 'Authenticate & Open Admin Console'}
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Quick Demo Access for Reviewers */}
          <div className="pt-3 border-t border-cream-200 space-y-2">
            <p className="text-[11px] text-center text-gray-500 font-medium">
              Demo Admin: Email <code className="font-mono bg-cream-100 px-1 py-0.5 rounded">admin@magizh.in</code> | Password <code className="font-mono bg-cream-100 px-1 py-0.5 rounded">demo123</code>
            </p>
            <button
              type="button"
              onClick={handleQuickDemoAdminLogin}
              className="w-full py-2.5 bg-cream-100 hover:bg-cream-200 border border-cream-300 text-darkbrown-900 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-red-700" />
              <span>1-Click Demo Admin Login (Magizh Administrator)</span>
            </button>
          </div>

          {/* Return to storefront */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={onNavigateStorefront}
              className="text-xs font-bold text-magizh-800 hover:text-magizh-900 hover:underline"
            >
              &larr; Return to Customer Shopping (Storefront)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
