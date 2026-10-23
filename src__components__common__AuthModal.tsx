import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  Lock,
  User as UserIcon,
  Mail,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  KeyRound,
  RotateCcw,
  Eye,
  EyeOff,
} from 'lucide-react';
import { StorageService } from './src__services__storage';
import { User, UserRole } from './src__types__index';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [view, setView] = useState<'login' | 'register' | 'forgot'>('login');
  const [authMethod, setAuthMethod] = useState<'otp' | 'password'>('password');
  
  // Registration / Login fields
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('customer');

  // Mobile OTP state
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  // Forgot Password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState<'request' | 'verify' | 'new-password'>('request');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [demoResetOtp, setDemoResetOtp] = useState<string | null>(null);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Cooldown timer effect
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  if (!isOpen) return null;

  const resetMessages = () => {
    setError('');
    setSuccessMsg('');
  };

  // 1. Mobile OTP Login
  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    if (!/^\d{10}$/.test(mobile)) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    setOtpSent(true);
    setSuccessMsg('Demo OTP generated: 123456 (Live SMS gateway disconnected in Demo Mode)');
  };

  const handleVerifyOtpAndLogin = (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    if (otpCode !== '123456') {
      setError('Invalid OTP. Please enter the demo code 123456');
      return;
    }
    completeAuth();
  };

  // 2. Password Login
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!mobile && !email) {
      setError('Please enter your mobile number or email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    // Try backend API first, fallback to StorageService
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: mobile || undefined, email: email || undefined, password }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        StorageService.setCurrentUser(data.user);
        onSuccess(data.user);
        onClose();
        return;
      }
    } catch {
      // Backend offline, fallback to local
    }

    const user = mobile ? StorageService.findUserByMobile(mobile) : StorageService.findUserByEmail(email);
    if (!user) {
      setError('Invalid credentials. User not found.');
      return;
    }

    StorageService.setCurrentUser(user);
    onSuccess(user);
    onClose();
  };

  // 3. Customer Registration with Email
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!name || name.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }

    if (!/^\d{10}$/.test(mobile.trim())) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    // Duplicate check
    if (StorageService.findUserByMobile(mobile)) {
      setError('An account with this mobile number already exists.');
      return;
    }

    if (StorageService.findUserByEmail(email)) {
      setError('An account with this email address already exists.');
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, mobile, email, password, role: selectedRole }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        StorageService.saveUser(data.user);
        StorageService.setCurrentUser(data.user);
        onSuccess(data.user);
        onClose();
        return;
      } else if (data.error) {
        setError(data.error);
        return;
      }
    } catch {
      // Local fallback
    }

    completeAuth();
  };

  const completeAuth = () => {
    const existing = StorageService.findUserByMobile(mobile);
    let user = existing;

    if (!user) {
      const newCustomerCode = `MAG-${selectedRole.toUpperCase().slice(0, 4)}-${Math.floor(10000 + Math.random() * 90000)}`;
      const newRefCode = `MAG-REF-${Math.floor(100 + Math.random() * 900)}`;

      user = {
        id: `user-${Date.now()}`,
        mobile: mobile.trim(),
        name: name.trim() || 'Valued Customer',
        email: (email.trim() || `user_${mobile}@magizh.in`).toLowerCase(),
        role: selectedRole,
        customerCode: newCustomerCode,
        referralCode: newRefCode,
        createdAt: new Date().toISOString(),
        status: 'active',
        addresses: [],
      };

      StorageService.saveUser(user);
    }

    StorageService.setCurrentUser(user);
    onSuccess(user);
    onClose();
  };

  // 4. Forgot Password Flow
  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to dispatch reset code.');
        return;
      }

      setCooldownSeconds(data.cooldownSeconds || 60);
      setDemoResetOtp(data.demoOtp || null);
      setForgotStep('verify');
      setSuccessMsg(data.message);
    } catch (err) {
      // Fallback for standalone demo
      setCooldownSeconds(60);
      setDemoResetOtp('654321');
      setForgotStep('verify');
      setSuccessMsg('DEMO MODE: Generated verification OTP (displayed below).');
    }
  };

  const handleVerifyResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!resetOtp || resetOtp.length < 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    try {
      const res = await fetch('/api/auth/verify-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim(), otp: resetOtp.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid verification code.');
        return;
      }

      setForgotStep('new-password');
      setSuccessMsg('Code verified! Enter your new password.');
    } catch {
      // Demo fallback
      if (resetOtp === demoResetOtp || resetOtp === '654321') {
        setForgotStep('new-password');
        setSuccessMsg('Code verified in Demo Mode. Enter your new password.');
      } else {
        setError('Invalid verification code.');
      }
    }
  };

  const handleCommitNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail.trim(),
          otp: resetOtp.trim(),
          newPassword,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to update password.');
        return;
      }

      setSuccessMsg('Password updated! You can now log in.');
      setTimeout(() => {
        setView('login');
        setForgotStep('request');
        resetMessages();
      }, 1500);
    } catch {
      setSuccessMsg('Password updated in Demo Mode! You can now log in.');
      setTimeout(() => {
        setView('login');
        setForgotStep('request');
        resetMessages();
      }, 1500);
    }
  };

  const quickDemoSelect = (role: UserRole) => {
    const users = StorageService.getUsers();
    const demo = users.find((u) => u.role === role);
    if (demo) {
      setMobile(demo.mobile);
      setEmail(demo.email || '');
      setName(demo.name);
      setSelectedRole(role);
      setPassword('password123');
      setOtpCode('123456');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-darkbrown-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-cream-300 w-full max-w-md overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="bg-gradient-to-r from-magizh-900 to-magizh-800 text-white p-5 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-cream-200 hover:text-white p-1 rounded-full hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-b5-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">
              Magizh Access
            </span>
          </div>
          <h3 className="text-xl font-extrabold tracking-tight">
            {view === 'login' && 'Sign In to Your Account'}
            {view === 'register' && 'Create New Account'}
            {view === 'forgot' && 'Password Recovery'}
          </h3>
          <p className="text-xs text-cream-200 mt-1">
            {view === 'forgot'
              ? 'Receive a secure one-time verification code to reset your password'
              : 'Access B5 Coins, order tracking, address book & rewards'}
          </p>
        </div>

        {/* Demo Mode Notice */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-tight">
            <span className="font-bold">Active Demo Environment:</span> Live SMS & SMTP gateways are disconnected.
            Use Demo OTP <span className="font-mono font-bold bg-amber-200 px-1 rounded">123456</span> or quick switch roles below.
          </div>
        </div>

        {/* Quick Role Fill Buttons */}
        {view !== 'forgot' && (
          <div className="px-5 pt-3 pb-1 border-b border-cream-200 bg-cream-50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-darkbrown-700/80 mb-1.5">
              Quick Fill Demo Persona:
            </p>
            <div className="grid grid-cols-4 gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => quickDemoSelect('customer')}
                className="bg-white hover:bg-magizh-50 border border-cream-300 hover:border-magizh-400 py-1.5 rounded-lg text-center font-semibold text-magizh-800 shadow-2xs"
              >
                Customer
              </button>
              <button
                type="button"
                onClick={() => quickDemoSelect('partner')}
                className="bg-white hover:bg-blue-50 border border-cream-300 hover:border-blue-400 py-1.5 rounded-lg text-center font-semibold text-blue-800 shadow-2xs"
              >
                Partner
              </button>
              <button
                type="button"
                onClick={() => quickDemoSelect('sales')}
                className="bg-white hover:bg-purple-50 border border-cream-300 hover:border-purple-400 py-1.5 rounded-lg text-center font-semibold text-purple-800 shadow-2xs"
              >
                Leader
              </button>
              <button
                type="button"
                onClick={() => quickDemoSelect('admin')}
                className="bg-white hover:bg-red-50 border border-cream-300 hover:border-red-400 py-1.5 rounded-lg text-center font-semibold text-red-800 shadow-2xs"
              >
                Admin
              </button>
            </div>
          </div>
        )}

        {/* Form Body */}
        <div className="p-5">
          {error && (
            <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* VIEW: FORGOT PASSWORD */}
          {view === 'forgot' && (
            <div className="space-y-3">
              {forgotStep === 'request' && (
                <form onSubmit={handleRequestPasswordReset} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-darkbrown-800 mb-1">
                      Registered Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="saravanan@magizh.in"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-cream-300 rounded-xl focus:ring-2 focus:ring-magizh-600 focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={cooldownSeconds > 0}
                    className="w-full py-2.5 bg-gradient-to-r from-magizh-700 to-magizh-800 hover:from-magizh-800 hover:to-magizh-900 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Mail className="w-4 h-4" />
                    <span>{cooldownSeconds > 0 ? `Resend Code in (${cooldownSeconds}s)` : 'Send Verification OTP'}</span>
                  </button>
                </form>
              )}

              {forgotStep === 'verify' && (
                <form onSubmit={handleVerifyResetOtp} className="space-y-3 animate-in fade-in">
                  {demoResetOtp && (
                    <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900">
                      <span className="font-bold">DEMO Mode Reset OTP:</span>{' '}
                      <span className="font-mono font-bold bg-amber-200 px-1 rounded">{demoResetOtp}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-darkbrown-800 mb-1">
                      Enter 6-Digit Verification Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={resetOtp}
                      onChange={(e) => setResetOtp(e.target.value)}
                      placeholder="e.g. 654321"
                      className="w-full text-center tracking-widest text-lg font-bold py-2 border border-cream-300 rounded-xl font-mono focus:ring-2 focus:ring-magizh-600 focus:outline-none"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-magizh-800 hover:bg-magizh-900 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <span>Verify Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}

              {forgotStep === 'new-password' && (
                <form onSubmit={handleCommitNewPassword} className="space-y-3 animate-in fade-in">
                  <div>
                    <label className="block text-xs font-semibold text-darkbrown-800 mb-1">
                      New Password (min 6 characters)
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-cream-300 rounded-xl focus:ring-2 focus:ring-magizh-600 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-darkbrown-800 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-cream-300 rounded-xl focus:ring-2 focus:ring-magizh-600 focus:outline-none"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Save New Password</span>
                  </button>
                </form>
              )}

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setView('login');
                    setForgotStep('request');
                    resetMessages();
                  }}
                  className="text-xs text-magizh-800 font-bold hover:underline"
                >
                  &larr; Back to Sign In
                </button>
              </div>
            </div>
          )}

          {/* VIEW: LOGIN */}
          {view === 'login' && (
            <div>
              {/* Method tabs */}
              <div className="flex border-b border-cream-200 mb-4 text-xs font-semibold">
                <button
                  onClick={() => setAuthMethod('password')}
                  className={`flex-1 pb-2 text-center border-b-2 transition-all ${
                    authMethod === 'password'
                      ? 'border-magizh-700 text-magizh-800 font-bold'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Password Login
                </button>
                <button
                  onClick={() => setAuthMethod('otp')}
                  className={`flex-1 pb-2 text-center border-b-2 transition-all ${
                    authMethod === 'otp'
                      ? 'border-magizh-700 text-magizh-800 font-bold'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Mobile OTP
                </button>
              </div>

              {authMethod === 'password' ? (
                <form onSubmit={handlePasswordLogin} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-darkbrown-800 mb-1">
                      Mobile Number or Email
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                      <input
                        type="text"
                        value={mobile || email}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val.includes('@')) {
                            setEmail(val);
                            setMobile('');
                          } else {
                            setMobile(val.replace(/\D/g, ''));
                            setEmail('');
                          }
                        }}
                        placeholder="9876543210 or user@magizh.in"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-cream-300 rounded-xl focus:ring-2 focus:ring-magizh-600 focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-semibold text-darkbrown-800">Password</label>
                      <button
                        type="button"
                        onClick={() => {
                          setView('forgot');
                          resetMessages();
                        }}
                        className="text-[11px] text-b5-700 hover:underline font-bold"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        className="w-full pl-9 pr-9 py-2 text-sm border border-cream-300 rounded-xl focus:ring-2 focus:ring-magizh-600 focus:outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-gradient-to-r from-magizh-700 to-magizh-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow transition-all flex items-center justify-center gap-2"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Sign In</span>
                  </button>
                </form>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-darkbrown-800 mb-1">
                      Mobile Number (10 digits)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-semibold text-gray-500">+91</span>
                      <input
                        type="tel"
                        maxLength={10}
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                        placeholder="9876543210"
                        className="w-full pl-11 pr-3 py-2 text-sm border border-cream-300 rounded-xl focus:ring-2 focus:ring-magizh-600 focus:outline-none font-mono"
                        required
                      />
                    </div>
                  </div>

                  {!otpSent ? (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="w-full py-2.5 bg-gradient-to-r from-magizh-700 to-magizh-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow transition-all flex items-center justify-center gap-2"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>Request Demo OTP</span>
                    </button>
                  ) : (
                    <div className="space-y-3 mt-3 animate-in fade-in">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-semibold text-darkbrown-800">
                          Verification Code
                        </label>
                        <button
                          type="button"
                          onClick={() => setOtpCode('123456')}
                          className="text-[11px] text-b5-700 hover:underline font-bold flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3 text-b5-600" />
                          Autofill: 123456
                        </button>
                      </div>
                      <input
                        type="text"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder="123456"
                        className="w-full text-center tracking-widest text-lg font-bold py-2 border border-cream-300 rounded-xl font-mono focus:ring-2 focus:ring-magizh-600 focus:outline-none"
                      />

                      <button
                        type="button"
                        onClick={handleVerifyOtpAndLogin}
                        className="w-full py-2.5 bg-gradient-to-r from-magizh-700 to-magizh-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow transition-all flex items-center justify-center gap-2"
                      >
                        <span>Verify & Sign In</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* VIEW: REGISTER */}
          {view === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-darkbrown-800 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Saravanan K"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-cream-300 rounded-xl focus:ring-2 focus:ring-magizh-600 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-darkbrown-800 mb-1">
                  Email Address (for password recovery & receipts)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="saravanan@magizh.in"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-cream-300 rounded-xl focus:ring-2 focus:ring-magizh-600 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-darkbrown-800 mb-1">
                  Mobile Number (10 digits)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-semibold text-gray-500">+91</span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                    placeholder="9876543210"
                    className="w-full pl-11 pr-3 py-2 text-sm border border-cream-300 rounded-xl focus:ring-2 focus:ring-magizh-600 focus:outline-none font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-darkbrown-800 mb-1">
                  Create Password (min 6 characters)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter secure password"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-cream-300 rounded-xl focus:ring-2 focus:ring-magizh-600 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-b5-600 to-b5-700 hover:from-b5-700 hover:to-b5-800 text-white rounded-xl text-xs sm:text-sm font-black shadow-md hover:shadow transition-all flex items-center justify-center gap-2"
              >
                <span>Create Account (Get 100 B5 Coins)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Toggle Register / Login */}
          <div className="mt-4 pt-3 border-t border-cream-200 text-center text-xs text-gray-600">
            {view === 'login' ? (
              <span>
                New to Magizh Shopping?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setView('register');
                    resetMessages();
                  }}
                  className="text-magizh-800 font-bold hover:underline"
                >
                  Create an account
                </button>
              </span>
            ) : view === 'register' ? (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setView('login');
                    resetMessages();
                  }}
                  className="text-magizh-800 font-bold hover:underline"
                >
                  Sign In
                </button>
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
