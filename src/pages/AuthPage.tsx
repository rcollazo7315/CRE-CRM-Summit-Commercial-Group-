import React, { useState } from 'react';
import { Building2, AlertCircle, User, Phone, Mail, Lock, Loader2, ShieldCheck, ArrowRight } from 'lucide-react';
import { api } from '../services/firestore';
import { UserAccount } from '../types';

interface AuthPageProps {
  onLogin: (user: UserAccount) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
  const [viewState, setViewState] = useState<'login' | 'register' | 'pending'>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (viewState === 'register') {
        if (formData.password !== formData.confirmPassword) {
          throw new Error("Passwords do not match");
        }
        if (formData.password.length < 6) {
          throw new Error("Password must be at least 6 characters");
        }

        await api.register({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          passwordHash: formData.password,
          username: formData.email.split('@')[0]
        });

        setViewState('pending');
      } else if (viewState === 'login') {
        const user = await api.login(formData.email, formData.password);
        
        if (user.status === 'pending') {
          setViewState('pending');
        } else {
          onLogin(user);
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      if (err.message && err.message.includes('pending')) {
        setViewState('pending');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- PENDING APPROVAL SCREEN ---
  if (viewState === 'pending') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="bg-white w-full max-w-lg rounded-2xl p-8 shadow-2xl text-center animate-in fade-in duration-500">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Registration Submitted</h2>
          <p className="text-slate-600 mb-6 leading-relaxed">
            Your account request is currently <strong>PENDING APPROVAL</strong>.<br/>
            An administrator must review your application before you can access the dashboard.
          </p>
          <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 mb-6 text-left border border-blue-100">
            <strong>System Note:</strong><br/>
            We have sent a notification to the admin team. You will be able to log in once your status is updated.
          </div>
          <button 
            onClick={() => {
              api.logout();
              setViewState('login');
            }}
            className="text-slate-500 hover:text-summit-900 font-medium text-sm underline flex items-center justify-center gap-1 mx-auto"
          >
            Back to Login <ArrowRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left Side Branding */}
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

      {/* Right Side Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-md">
           <div className="text-center mb-10 lg:hidden">
            <Building2 size={40} className="text-summit-900 mx-auto mb-2" />
            <h1 className="text-2xl font-bold text-slate-900">Summit Commercial Group</h1>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {viewState === 'register' ? 'Agent Application' : 'Welcome Back'}
            </h2>
            <p className="text-slate-500 mb-6 text-sm">
              {viewState === 'register' ? 'Join our exclusive network.' : 'Sign in to access your dashboard.'}
            </p>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 flex items-center gap-2 border border-red-100">
                <AlertCircle size={16} /> {error}
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
                        placeholder="First Name"
                        required
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-summit-accent outline-none"
                        value={formData.firstName}
                        onChange={e => setFormData({...formData, firstName: e.target.value})}
                      />
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Last Name"
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-summit-accent outline-none"
                        value={formData.lastName}
                        onChange={e => setFormData({...formData, lastName: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3.5 text-slate-400" size={18} />
                    <input
                      type="tel"
                      placeholder="Phone Number"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-summit-accent outline-none"
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </>
              )}

              <div className="relative">
                <Mail className="absolute left-3 top-3.5 text-slate-400" size={18} />
                <input
                  type="email"
                  placeholder="Email Address"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-summit-accent outline-none"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-3.5 text-slate-400" size={18} />
                <input
                  type="password"
                  placeholder="Password"
                  required
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
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-summit-accent outline-none"
                    value={formData.confirmPassword}
                    onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-summit-900 text-white py-3 rounded-lg font-semibold hover:bg-summit-800 shadow-lg shadow-summit-900/20 transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
              >
                {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : (viewState === 'register' ? 'Submit Application' : 'Sign In')}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-500">
              {viewState === 'register' ? 'Already have an account? ' : 'Need an account? '}
              <button 
                onClick={() => {
                  setError('');
                  setViewState(viewState === 'login' ? 'register' : 'login');
                }}
                className="text-summit-accent font-semibold hover:underline"
              >
                {viewState === 'register' ? 'Sign In' : 'Apply Now'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;