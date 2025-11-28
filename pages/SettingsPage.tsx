
import React, { useState, useRef } from 'react';
import { Save, User, Mail, Phone, Lock, Bell, Camera, CheckCircle, AlertCircle } from 'lucide-react';
import { UserAccount } from '../types';
import { api } from '../services/firestore';
import { useAuth } from '../context/AuthContext';

interface SettingsPageProps {
  user: UserAccount;
  onUpdateProfile: (data: Partial<UserAccount>) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ user, onUpdateProfile }) => {
  const { refreshUser } = useAuth(); // Hook to trigger global user refresh after updates
  const [formData, setFormData] = useState({ ...user });
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        await onUpdateProfile(formData);
        await refreshUser(); // Ensures avatar/name updates in sidebar immediately
        setSuccessMsg('Profile updated successfully');
        setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
        setErrorMsg('Failed to update profile.');
        setTimeout(() => setErrorMsg(''), 3000);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (passwordData.new !== passwordData.confirm) {
      setErrorMsg("New passwords do not match");
      return;
    }
    
    if (passwordData.new.length < 6) {
        setErrorMsg("Password must be at least 6 characters.");
        return;
    }

    try {
        await api.updateUserPassword(passwordData.new);
        setSuccessMsg('Password changed successfully');
        setPasswordData({ current: '', new: '', confirm: '' });
        setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
        setErrorMsg(err.message || 'Failed to change password. Please try logging in again.');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        setFormData(prev => ({ ...prev, avatar: base64String }));
        
        // Save immediately for better UX
        await onUpdateProfile({ avatar: base64String }); 
        await refreshUser();
      };
      reader.readAsDataURL(file);
    }
  };

  const formatPhoneNumber = (value: string) => {
    const phoneNumber = value.replace(/\D/g, '');
    if (phoneNumber.length < 4) return phoneNumber;
    if (phoneNumber.length < 7) return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData(prev => ({ ...prev, phone: formatted }));
  };

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Account Settings</h1>
      
      {successMsg && (
        <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-4 border border-green-100">
          <CheckCircle size={20} /> {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-4 border border-red-100">
          <AlertCircle size={20} /> {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-center">
            <div className="relative inline-block mb-4 group">
              <img src={formData.avatar} alt="Profile" className="w-32 h-32 rounded-full border-4 border-slate-50 object-cover" />
              <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 bg-summit-900 text-white p-2 rounded-full hover:bg-summit-800 shadow-md transition-colors group-hover:scale-110 transform">
                <Camera size={16} />
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
            </div>
            <h2 className="font-bold text-lg text-slate-900">{formData.firstName} {formData.lastName}</h2>
            <p className="text-slate-500 text-sm capitalize">{formData.role}</p>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50">
               <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                 <Bell size={16} className="text-summit-accent" /> Notification Preferences
               </h3>
             </div>
             <div className="p-6">
               <div className="flex justify-end gap-6 mb-4 px-2">
                  <span title="Email Notifications" className="text-slate-400 hover:text-summit-900 transition-colors"><Mail size={16} /></span>
                  <span title="SMS Notifications" className="text-slate-400 hover:text-summit-900 transition-colors"><Phone size={16} /></span>
               </div>
               <div className="space-y-1">
                 {['Deal Updates', 'Task Reminders', 'New Messages', 'System Alerts'].map((label, idx) => {
                   const key = ['dealUpdates', 'taskReminders', 'newMessages', 'systemAlerts'][idx] as keyof typeof formData.notifications.email;
                   return (
                     <div key={key} className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-slate-50 transition-colors">
                       <span className="text-slate-700 text-sm font-medium">{label}</span>
                       <div className="flex gap-8 mr-1">
                          <label className="cursor-pointer relative flex items-center">
                            <input 
                              type="checkbox" 
                              checked={formData.notifications.email[key]}
                              onChange={e => {
                                 const updated = { ...formData.notifications, email: { ...formData.notifications.email, [key]: e.target.checked } };
                                 setFormData({ ...formData, notifications: updated });
                                 onUpdateProfile({ notifications: updated });
                              }}
                              className="appearance-none w-4 h-4 rounded border border-slate-300 checked:bg-summit-accent checked:border-summit-accent transition-colors cursor-pointer" 
                            />
                            {formData.notifications.email[key] && <CheckCircle size={10} className="absolute inset-0 m-auto text-white pointer-events-none" />}
                          </label>
                          <label className="cursor-pointer relative flex items-center">
                            <input 
                              type="checkbox" 
                              checked={formData.notifications.sms[key]}
                              onChange={e => {
                                 const updated = { ...formData.notifications, sms: { ...formData.notifications.sms, [key]: e.target.checked } };
                                 setFormData({ ...formData, notifications: updated });
                                 onUpdateProfile({ notifications: updated });
                              }}
                              className="appearance-none w-4 h-4 rounded border border-slate-300 checked:bg-summit-accent checked:border-summit-accent transition-colors cursor-pointer" 
                            />
                             {formData.notifications.sms[key] && <CheckCircle size={10} className="absolute inset-0 m-auto text-white pointer-events-none" />}
                          </label>
                       </div>
                     </div>
                   );
                 })}
               </div>
             </div>
          </div>
        </div>

        {/* Forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Form */}
          <form onSubmit={handleProfileSubmit} className="bg-white rounded-xl shadow-sm border border-slate-100 p-8">
            <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
              <User size={20} className="text-slate-400" /> Personal Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">First Name</label>
                <input type="text" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-summit-accent/20 focus:border-summit-accent transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Last Name</label>
                <input type="text" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-summit-accent/20 focus:border-summit-accent transition-all" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-3.5 text-slate-400" />
                  <input type="email" value={formData.email} disabled className="w-full pl-10 p-2.5 bg-slate-100 border border-slate-200 rounded-lg outline-none text-slate-500 cursor-not-allowed" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-3.5 text-slate-400" />
                  <input 
                    type="tel" 
                    value={formData.phone} 
                    onChange={handlePhoneChange} 
                    maxLength={14}
                    className="w-full pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-summit-accent/20 focus:border-summit-accent transition-all" 
                    placeholder="(555) 555-5555"
                  />
                </div>
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-sm font-medium text-slate-700 mb-2">Professional Bio</label>
              <textarea rows={4} value={formData.bio || ''} onChange={e => setFormData({...formData, bio: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-summit-accent/20 focus:border-summit-accent transition-all" placeholder="Tell us about your experience..." />
            </div>

            <div className="flex justify-end pt-6 border-t border-slate-50">
              <button type="submit" className="bg-summit-900 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-summit-800 shadow-lg shadow-summit-900/10 transition-all flex items-center gap-2">
                <Save size={18} /> Save Changes
              </button>
            </div>
          </form>

          {/* Password */}
          <form onSubmit={handlePasswordSubmit} className="bg-white rounded-xl shadow-sm border border-slate-100 p-8">
            <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
              <Lock size={20} className="text-slate-400" /> Security
            </h3>
            <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm mb-6 border border-blue-100">
                To update your password, you must be logged in recently. If this fails, please sign out and sign back in.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">New Password</label>
                <input type="password" value={passwordData.new} onChange={e => setPasswordData({...passwordData, new: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-summit-accent/20 focus:border-summit-accent transition-all" minLength={6} placeholder="Min 6 chars" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Confirm Password</label>
                <input type="password" value={passwordData.confirm} onChange={e => setPasswordData({...passwordData, confirm: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-summit-accent/20 focus:border-summit-accent transition-all" minLength={6} placeholder="Retype new password" />
              </div>
            </div>
            <div className="flex justify-end mt-8 pt-6 border-t border-slate-50">
              <button type="submit" className="text-slate-600 bg-slate-100 px-6 py-2.5 rounded-lg font-medium hover:bg-slate-200 hover:text-slate-800 transition-colors">
                Update Password
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
