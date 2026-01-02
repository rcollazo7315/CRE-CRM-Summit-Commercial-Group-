import React, { useState } from 'react';
import { X, Calendar, Clock, AlertCircle } from 'lucide-react';
import { Task, TaskType, TaskPriority } from '../types.ts';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task>) => void;
  initialData?: Partial<Task>;
  dealId?: string; // If creating from a specific deal
}

const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onSave, initialData, dealId }) => {
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    type: 'call',
    dueDate: new Date().toISOString().split('T')[0],
    dueTime: '09:00',
    priority: 'medium',
    status: 'pending',
    dealId: dealId || '',
    reminderTime: 30, // Default 30 min before
    ...initialData
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex justify-between items-center p-5 border-b border-slate-100">
          <h3 className="font-bold text-lg text-slate-800">{initialData?.id ? 'Edit Task' : 'New Task'}</h3>
          <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Task Title</label>
            <input 
              required
              type="text" 
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-summit-accent outline-none"
              placeholder="e.g. Call property owner"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select 
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value as TaskType})}
                className="w-full p-2 border border-slate-300 rounded-lg outline-none"
              >
                {['call', 'email', 'follow-up', 'meeting', 'proposal', 'site-visit', 'document', 'other'].map(t => (
                  <option key={t} value={t} className="capitalize">{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
              <select 
                value={formData.priority}
                onChange={e => setFormData({...formData, priority: e.target.value as TaskPriority})}
                className="w-full p-2 border border-slate-300 rounded-lg outline-none"
              >
                {['low', 'medium', 'high', 'urgent'].map(p => (
                  <option key={p} value={p} className="capitalize">{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-3 text-slate-400" />
                <input 
                  required
                  type="date"
                  value={formData.dueDate}
                  onChange={e => setFormData({...formData, dueDate: e.target.value})}
                  className="w-full pl-10 p-2 border border-slate-300 rounded-lg outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
              <div className="relative">
                <Clock size={16} className="absolute left-3 top-3 text-slate-400" />
                <input 
                  required
                  type="time"
                  value={formData.dueTime}
                  onChange={e => setFormData({...formData, dueTime: e.target.value})}
                  className="w-full pl-10 p-2 border border-slate-300 rounded-lg outline-none"
                />
              </div>
            </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
             <textarea 
               rows={3}
               value={formData.description}
               onChange={e => setFormData({...formData, description: e.target.value})}
               className="w-full p-2 border border-slate-300 rounded-lg outline-none"
               placeholder="Additional details..."
             />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-summit-900 text-white rounded-lg font-medium hover:bg-summit-800">Save Task</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;