
import React, { useState, useRef } from 'react';
import { Save, User, Mail, Phone, Lock, Bell, Camera, CheckCircle } from 'lucide-react';
import { UserAccount } from '../types';

interface SettingsPageProps {
  user: UserAccount;
  onUpdateProfile: (data: Partial<UserAccount>) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ user, onUpdateProfile }) => {
  const [formData, setFormData] = useState({ ...user });
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(formData);
    setSuccessMsg('Profile updated successfully');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.new !== passwordData.confirm) {
      alert("New passwords do not match");
      return;
    }
    // In real app, we verify current password hash. Here we just simulate success.
    setSuccessMsg('Password changed successfully');
    setPasswordData({ current: '', new: '', confirm: '' });
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormData(prev => ({ ...prev, avatar: base64String }));
        onUpdateProfile({ avatar: base64String }); 
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Account Settings</h1>
      {successMsg && (
        <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <CheckCircle size={20} /> {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-center">
            <div className="relative inline-block mb-4">
              <img src={formData.avatar} alt="Profile" className="w-32 h-32 rounded-full border-4 border-slate-50 object-cover" />
              <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 bg-summit-900 text-white p-2 rounded-full hover:bg-summit-800 shadow-md transition-colors">
                <Camera size={16} />
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
            </div>
            <h2 className="font-bold text-lg text-slate-900">{formData.firstName} {formData.lastName}</h2>
            <p className="text-slate-500 text-sm capitalize">{formData.role}</p>
          </div>

          {/* Notifications Moved Here */}
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
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-summit-accent/20 focus:border-summit-accent transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-3.5 text-slate-400" />
                  <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-summit-accent/20 focus:border-summit-accent transition-all" />
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">New Password</label>
                <input type="password" value={passwordData.new} onChange={e => setPasswordData({...passwordData, new: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-summit-accent/20 focus:border-summit-accent transition-all" minLength={6} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Confirm Password</label>
                <input type="password" value={passwordData.confirm} onChange={e => setPasswordData({...passwordData, confirm: e.target.value})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-summit-accent/20 focus:border-summit-accent transition-all" minLength={6} />
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
