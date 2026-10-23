import React, { useState } from 'react';
import { Store, ShieldCheck, ArrowRight, Lock, Phone, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { User } from '../../types';
import { StorageService } from '../../services/storage';

interface PartnerAuthGuardProps {
  currentUser: User;
  onLoginSuccess: (user: User) => void;
  onNavigateStorefront: () => void;
  children: React.ReactNode;
}

export const PartnerAuthGuard: React.FC<PartnerAuthGuardProps> = ({
  currentUser,
  onLoginSuccess,
  onNavigateStorefront,
  children,
}) => {
  // If already authenticated as partner or admin, show Partner Dashboard
  if (currentUser.role === 'partner' || currentUser.role === 'admin') {
    return <>{children}</>;
  }

  const [identifier, setIdentifier] = useState('9843210987');
  const [password, setPassword] = useState('demo123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      const users = StorageService.getUsers();
      const trimmed = identifier.trim().toLowerCase();
      const user = users.find(
        (u) => (u.mobile === trimmed || u.email?.toLowerCase() === trimmed)
      );

      if (!user) {
        setError('No account found with this mobile or email. Please check your credentials.');
        setLoading(false);
        return;
      }

      if (user.role !== 'partner' && user.role !== 'admin') {
        setError(`Access Denied: The account "${user.name}" is registered as a ${user.role}. Partner portal requires a Partner franchise account.`);
        setLoading(false);
        return;
      }

      StorageService.setCurrentUser(user);
      onLoginSuccess(user);
      setLoading(false);
    }, 250);
  };

  const handleQuickDemoLogin = () => {
    const partnerUser = StorageService.switchRole('partner');
    onLoginSuccess(partnerUser);
  };

  return (
    <div className="max-w-lg mx-auto my-8 sm:my-14 px-4">
      <div className="bg-white rounded-3xl border border-cream-300 shadow-xl overflow-hidden">
        {/* Portal Header */}
        <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-darkbrown-900 text-white p-6 sm:p-8 text-center relative">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Store className="w-8 h-8 text-blue-200" />
          </div>
          <span className="inline-block bg-blue-700/80 text-blue-100 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-2">
            Magizh Franchise Network
          </span>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">Partner Shop & POS Portal</h1>
          <p className="text-xs text-blue-200 mt-1 max-w-sm mx-auto">
            Authorized access for franchise shop billing, in-store B5 Coin redemption, and fulfillment operations.
          </p>
        </div>

        {/* Current Session Warning (if logged in as ordinary customer) */}
        {currentUser.role === 'customer' && (
          <div className="mx-6 mt-6 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Currently Viewing as Customer: {currentUser.name}</p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                The Partner Dashboard requires franchise partner credentials. Sign in below or switch to demo partner.
              </p>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="p-6 sm:p-8 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-darkbrown-900 mb-1">
              Partner Mobile Number or Email
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="9843210987 or kovaiorganics@magizh.in"
                className="w-full pl-9 pr-3 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-700 text-darkbrown-900"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-darkbrown-900 mb-1">
              Partner Access Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 bg-cream-50 border border-cream-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-700 text-darkbrown-900"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Authenticating Partner...' : 'Sign In to Partner Dashboard'}
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Quick Demo Access for Evaluators */}
          <div className="pt-3 border-t border-cream-200 space-y-2">
            <p className="text-[11px] text-center text-gray-500 font-medium">
              Demo Credentials: Mobile <code className="font-mono bg-cream-100 px-1 py-0.5 rounded">9843210987</code> | Password <code className="font-mono bg-cream-100 px-1 py-0.5 rounded">demo123</code>
            </p>
            <button
              type="button"
              onClick={handleQuickDemoLogin}
              className="w-full py-2.5 bg-cream-100 hover:bg-cream-200 border border-cream-300 text-darkbrown-900 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-blue-700" />
              <span>1-Click Demo Partner Access (Muthusamy R — Kovai Organics)</span>
            </button>
          </div>

          {/* Storefront return link */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={onNavigateStorefront}
              className="text-xs font-bold text-magizh-800 hover:text-magizh-900 hover:underline"
            >
              &larr; Back to Magizh Customer Shopping (Storefront)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
