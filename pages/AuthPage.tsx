import React, { useState, useEffect } from 'react';
import { Building2, CheckCircle, Lock, Mail, User, Phone, Briefcase, Loader2, Terminal, AlertCircle, ShieldCheck, MousePointerClick } from 'lucide-react';
import { generateRegistrationEmails } from '../services/geminiService';
import { UserAccount } from '../types';

interface AuthPageProps {
  onLogin: (username: string, password: string) => { success: boolean; message?: string };
  onRegister: (userData: Omit<UserAccount, 'id' | 'status' | 'avatar'>) => UserAccount;
  onSimulateAdminApprove: (username: string) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin, onRegister, onSimulateAdminApprove }) => {
  const [viewState, setViewState] = useState<'login' | 'register' | 'forgot-password'>('login');
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentEmails, setSentEmails] = useState<{adminEmail: string, userEmail: string} | null>(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    licenseNumber: '',
    password: '',
    confirmPassword: ''
  });

  // Real-time password validation
  useEffect(() => {
    if (viewState === 'register' && formData.confirmPassword) {
      if (formData.password !== formData.confirmPassword) {
        setPasswordError("Passwords do not match");
      } else {
        setPasswordError("");
      }
    } else {
      setPasswordError("");
    }
  }, [formData.password, formData.confirmPassword, viewState]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsSubmitting(true);

    // --- REGISTER FLOW ---
    if (viewState === 'register') {
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match.");
        setIsSubmitting(false);
        return;
      }

      // Store in Mock Database via App.tsx
      const newUser = onRegister({
        name: formData.name,
        username: formData.username,
        email: formData.email,
        phone: formData.phone,
        licenseNumber: formData.licenseNumber,
        passwordHash: formData.password
      });

      // Generate simulated emails
      const emails = await generateRegistrationEmails(
        formData.name, 
        formData.email,
        formData.username,
        formData.licenseNumber
      );
      setSentEmails(emails);
      setIsSubmitting(false);
      setIsPendingApproval(true);
      return;
    } 
    
    // --- LOGIN FLOW ---
    if (viewState === 'login') {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const result = onLogin(formData.username, formData.password); // Username field is used for email or username
      
      if (!result.success) {
        setError(result.message || 'An error occurred.');
        setIsSubmitting(false);
        return;
      }
      
      // Success is handled by parent App.tsx redirecting
      return;
    }

    // --- FORGOT PASSWORD FLOW ---
    if (viewState === 'forgot-password') {
       await new Promise(resolve => setTimeout(resolve, 1000));
       setSuccessMsg(`Password reset instructions sent to ${formData.email}`);
       setIsSubmitting(false);
    }
  };

  // --- RENDER: APPROVAL SCREEN ---
  if (isPendingApproval) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white w-full max-w-2xl rounded-2xl p-8 shadow-2xl text-center my-8 animate-in fade-in duration-500">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Registration Submitted</h2>
          <p className="text-slate-600 mb-6 leading-relaxed">
            Your account request is currently <strong>PENDING APPROVAL</strong>.<br/>
            An administrator (<span className="font-semibold text-summit-900">raphael@sumcg.com</span>) has been notified.
          </p>
          
          {sentEmails && (
            <div className="text-left mb-6 border border-slate-200 rounded-lg overflow-hidden shadow-sm">
              <div className="bg-slate-800 text-slate-300 px-4 py-2 text-xs uppercase tracking-wider font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2"><Terminal size={14} /> System Mailer Log</span>
                <span className="bg-green-500 text-white text-[10px] px-1.5 rounded">SENT</span>
              </div>
              <div className="bg-slate-50 p-4 space-y-6 max-h-96 overflow-y-auto">
                {/* User Email */}
                <div className="bg-white p-4 rounded border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase">To Applicant:</span>
                    <span className="text-xs font-mono text-slate-600">{formData.email}</span>
                  </div>
                  <div className="text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">
                    {sentEmails.userEmail}
                  </div>
                </div>

                {/* Admin Email */}
                <div className="bg-white p-4 rounded border border-slate-200 shadow-sm relative overflow-hidden">
                   <div className="absolute top-0 right-0 bg-red-50 text-red-600 text-[10px] font-bold px-2 py-1">ADMIN ACTION REQUIRED</div>
                  <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase">To Admin:</span>
                    <span className="text-xs font-mono text-slate-600">raphael@sumcg.com</span>
                  </div>
                  <div className="text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">
                    {sentEmails.adminEmail}
                  </div>
                  
                  {/* Simulation Button */}
                  <div className="mt-4 pt-4 border-t border-dashed border-slate-300 flex justify-center">
                    <button 
                      onClick={() => {
                        onSimulateAdminApprove(formData.username);
                        setIsPendingApproval(false);
                        setViewState('login');
                        setSuccessMsg('Account approved! You may now log in.');
                      }}
                      className="flex items-center gap-2 bg-green-600 text-white text-xs font-bold px-4 py-2 rounded hover:bg-green-700 transition-all shadow-lg transform hover:-translate-y-1"
                    >
                      <MousePointerClick size={14} />
                      DEMO: SIMULATE ADMIN CLICKING "APPROVE"
                    </button>
                  </div>
                  <p className="text-center text-[10px] text-slate-400 mt-2">
                    (In a real app, the admin would click the link in their email client)
                  </p>
                </div>
              </div>
            </div>
          )}

          <button 
            onClick={() => { 
              setIsPendingApproval(false); 
              setViewState('login');
              setSentEmails(null);
            }}
            className="mt-4 text-slate-500 hover:text-summit-900 font-medium text-sm"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // --- RENDER: MAIN AUTH SCREEN ---
  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left Side - Image/Branding */}
      <div className="hidden lg:flex w-1/2 bg-summit-900 relative items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')] bg-cover bg-center"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-summit-900 to-transparent"></div>
        <div className="relative z-10 text-center text-white px-12">
          <div className="mb-6 flex justify-center">
            <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/10">
              <Building2 size={48} className="text-summit-accent" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4 tracking-tight">Summit Commercial Group</h1>
          <p className="text-slate-300 text-lg max-w-md mx-auto leading-relaxed">
            The premier platform for managing high-value commercial real estate transactions with precision and intelligence.
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 overflow-y-auto h-screen">
        <div className="w-full max-w-md my-auto">
          <div className="text-center mb-10 lg:hidden">
            <Building2 size={40} className="text-summit-900 mx-auto mb-2" />
            <h1 className="text-2xl font-bold text-slate-900">Summit Commercial Group</h1>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 relative">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {viewState === 'register' ? 'Agent Registration' : viewState === 'forgot-password' ? 'Reset Password' : 'Welcome Back'}
            </h2>
            <p className="text-slate-500 mb-6 text-sm">
              {viewState === 'register' ? 'Apply to join our exclusive network.' : viewState === 'forgot-password' ? 'Enter your email to receive recovery instructions.' : 'Sign in to access your dashboard.'}
            </p>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 flex items-center gap-2 animate-pulse border border-red-100">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            {successMsg && (
               <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm mb-6 flex items-center gap-2 border border-green-100">
                <CheckCircle size={16} /> {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {viewState === 'register' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <User className="absolute left-3 top-3.5 text-slate-400" size={18} />
                      <input
                        type="text"
                        placeholder="Full Name"
                        required
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-summit-accent outline-none"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                    <div className="relative">
                      <User className="absolute left-3 top-3.5 text-slate-400" size={18} />
                      <input
                        type="text"
                        placeholder="Username"
                        required
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-summit-accent outline-none"
                        value={formData.username}
                        onChange={e => setFormData({...formData, username: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <Phone className="absolute left-3 top-3.5 text-slate-400" size={18} />
                    <input
                      type="tel"
                      placeholder="Phone Number"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-summit-accent outline-none"
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                   <div className="relative">
                    <Briefcase className="absolute left-3 top-3.5 text-slate-400" size={18} />
                    <input
                      type="text"
                      placeholder="License Number"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-summit-accent outline-none"
                      value={formData.licenseNumber}
                      onChange={e => setFormData({...formData, licenseNumber: e.target.value})}
                    />
                  </div>
                </>
              )}

              <div className="relative">
                <div className="absolute left-3 top-3.5 text-slate-400">
                  {viewState === 'login' ? <User size={18} /> : <Mail size={18} />}
                </div>
                <input
                  type={viewState === 'login' ? 'text' : 'email'}
                  placeholder={viewState === 'login' ? 'Username or Email' : 'Email Address'}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-summit-accent outline-none"
                  value={viewState === 'login' ? formData.username : formData.email}
                  onChange={e => viewState === 'login' ? setFormData({...formData, username: e.target.value}) : setFormData({...formData, email: e.target.value})}
                />
              </div>

              {viewState !== 'forgot-password' && (
                <>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 text-slate-400" size={18} />
                    <input
                      type="password"
                      placeholder="Password"
                      required
                      minLength={8}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-summit-accent outline-none"
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                    />
                  </div>
                  {viewState === 'register' && (
                    <div className="relative">
                      <Lock className="absolute left-3 top-3.5 text-slate-400" size={18} />
                      <input
                        type="password"
                        placeholder="Confirm Password"
                        required
                        className={`w-full pl-10 pr-4 py-3 bg-slate-50 border rounded-lg focus:ring-2 outline-none transition-colors ${passwordError ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-summit-accent'}`}
                        value={formData.confirmPassword}
                        onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                      />
                      {passwordError && (
                        <span className="absolute right-3 top-3.5 text-red-500 text-xs font-bold">{passwordError}</span>
                      )}
                    </div>
                  )}
                </>
              )}

              {viewState === 'login' && (
                <div className="flex justify-end">
                  <button 
                    type="button" 
                    onClick={() => setViewState('forgot-password')}
                    className="text-xs text-slate-500 hover:text-summit-accent transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !!passwordError}
                className="w-full bg-summit-900 text-white py-3 rounded-lg font-semibold hover:bg-summit-800 shadow-lg shadow-summit-900/20 transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={20} />
                    Processing...
                  </>
                ) : (
                  viewState === 'register' ? 'Request Account' : viewState === 'forgot-password' ? 'Send Reset Link' : 'Sign In'
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-500">
              {viewState === 'register' ? 'Already have an account? ' : viewState === 'forgot-password' ? 'Remembered it? ' : 'Need an account? '}
              <button 
                onClick={() => {
                  setError('');
                  setSuccessMsg('');
                  setFormData({...formData, password: '', confirmPassword: ''});
                  setPasswordError('');
                  setViewState(viewState === 'login' ? 'register' : 'login');
                }}
                className="text-summit-accent font-semibold hover:underline"
              >
                {viewState === 'register' ? 'Sign In' : viewState === 'forgot-password' ? 'Back to Login' : 'Apply Now'}
              </button>
            </div>
          </div>
          
          <p className="text-center text-xs text-slate-400 mt-8">
            &copy; 2024 Summit Commercial Group. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;