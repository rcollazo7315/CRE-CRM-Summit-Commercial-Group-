import React, { useState, useRef } from 'react';
import { Save, User, Mail, Phone, Lock, Bell, Shield, Camera } from 'lucide-react';

interface SettingsPageProps {
  user: {
    name: string;
    email: string;
    phone?: string;
    bio?: string;
    avatar: string;
  };
  onUpdateProfile: (data: any) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ user, onUpdateProfile }) => {
  const [formData, setFormData] = useState({ ...user });
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormData(prev => ({ ...prev, avatar: base64String }));
        onUpdateProfile({ ...formData, avatar: base64String }); // Immediate update for UI
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(formData);
    setSuccessMsg('Profile updated successfully!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Account Settings</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Profile Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-center">
            <div className="relative inline-block mb-4 group">
              <img 
                src={formData.avatar} 
                alt="Profile" 
                className="w-32 h-32 rounded-full border-4 border-slate-50 object-cover"
              />
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-summit-900 text-white p-2 rounded-full hover:bg-summit-800 transition-colors shadow-md"
              >
                <Camera size={16} />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleImageUpload} 
              />
            </div>
            <h2 className="font-bold text-lg text-slate-900">{formData.name}</h2>
            <p className="text-slate-500 text-sm">Commercial Agent</p>
            <div className="mt-4 flex justify-center gap-2">
              <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">Verified Agent</span>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
             <div className="p-4 border-b border-slate-100 font-bold text-slate-800 flex items-center gap-2">
               <Bell size={18} /> Notifications
             </div>
             <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                   <span className="text-sm text-slate-600">Email Alerts</span>
                   <div className="w-10 h-6 bg-summit-accent rounded-full relative cursor-pointer"><div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div></div>
                </div>
                <div className="flex items-center justify-between">
                   <span className="text-sm text-slate-600">SMS Updates</span>
                   <div className="w-10 h-6 bg-slate-200 rounded-full relative cursor-pointer"><div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full"></div></div>
                </div>
             </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="md:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-100 p-8">
            <div className="flex justify-between items-center mb-6">
               <h3 className="font-bold text-lg text-slate-800">Edit Profile</h3>
               {successMsg && <span className="text-sm text-green-600 font-medium animate-pulse">{successMsg}</span>}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                  <div className="relative">
                    <User size={18} className="absolute left-3 top-3 text-slate-400" />
                    <input 
                      name="name"
                      type="text" 
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-summit-accent outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                  <div className="relative">
                    <Phone size={18} className="absolute left-3 top-3 text-slate-400" />
                    <input 
                      name="phone"
                      type="tel" 
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-summit-accent outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-3 text-slate-400" />
                  <input 
                    name="email"
                    type="email" 
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-summit-accent outline-none"
                  />
                </div>
              </div>

               <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Professional Bio</label>
                <textarea 
                  name="bio"
                  rows={4}
                  value={formData.bio}
                  onChange={handleChange}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-summit-accent outline-none"
                  placeholder="Tell clients about your experience..."
                />
              </div>

              <div className="pt-4 border-t border-slate-100 mt-4">
                <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Shield size={18} /> Security
                </h4>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
                    <div className="relative">
                      <Lock size={18} className="absolute left-3 top-3 text-slate-400" />
                      <input type="password" placeholder="••••••••" className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-summit-accent outline-none" />
                    </div>
                  </div>
                   <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                    <div className="relative">
                      <Lock size={18} className="absolute left-3 top-3 text-slate-400" />
                      <input type="password" placeholder="••••••••" className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-summit-accent outline-none" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6 mt-2">
              <button 
                type="submit"
                className="bg-summit-900 text-white px-6 py-2.5 rounded-lg font-bold shadow-lg hover:bg-summit-800 transition-colors flex items-center gap-2"
              >
                <Save size={18} /> Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
