
import React, { useEffect, useState } from 'react';
import { Calendar, Clock, CheckCircle2, AlertCircle, ShieldOff, Save, Search } from 'lucide-react';
import { Deal, ContractDates, DeadlineStatus } from '../types.ts';
import { addDaysToDate, getDaysRemaining, getDeadlineColor, isValidDate } from '../utils/dateUtils.ts';

interface ContractDatesFormProps {
  deal: Partial<Deal>;
  onChange: (updatedDates: ContractDates) => void;
}

const ContractDatesForm: React.FC<ContractDatesFormProps> = ({ deal, onChange }) => {
  const defaultDates: ContractDates = {
    contractDate: '',
    dueDiligence: { days: 30, status: 'pending' },
    financing: { days: 45, status: 'pending' },
    closing: { days: 60, status: 'pending' },
  };

  const [dates, setDates] = useState<ContractDates>(deal.contractDates || defaultDates);

  // Sync internal state if props change drastically (e.g. new deal loaded)
  useEffect(() => {
    if (deal.contractDates) {
      setDates(deal.contractDates);
    }
  }, [deal.contractDates]);

  // Recalculate deadlines whenever contract date or durations change
  useEffect(() => {
    if (dates.contractDate) {
      const updated = { ...dates };
      let changed = false;

      // Helper to update a specific key if needed
      const updateKey = (key: keyof ContractDates) => {
        if (key === 'contractDate') return;
        const item = updated[key] as any;
        const newDeadline = addDaysToDate(dates.contractDate!, item.days);
        if (item.date !== newDeadline) {
          item.date = newDeadline;
          changed = true;
        }
      };

      updateKey('dueDiligence');
      updateKey('financing');
      updateKey('closing');

      if (changed) {
        setDates(updated);
        onChange(updated); // Propagate changes up immediately
      }
    }
  }, [dates.contractDate, dates.dueDiligence.days, dates.financing.days, dates.closing.days]);

  const handleChange = (field: string, value: any) => {
    const newDates = { ...dates };
    
    if (field === 'contractDate') {
      newDates.contractDate = value;
    } else {
      const [key, subField] = field.split('.');
      if (key && subField) {
        (newDates as any)[key][subField] = value;
        // If changing days, status might reset if it was expired, but we'll leave manual waivers alone
      }
    }
    
    setDates(newDates);
    onChange(newDates);
  };

  const handleWaive = (key: keyof ContractDates) => {
    if (key === 'contractDate') return;
    const item = dates[key] as any;
    const isWaived = item.status === 'waived';
    
    const updated = {
      ...dates,
      [key]: {
        ...item,
        status: isWaived ? 'pending' : 'waived',
        waivedDate: isWaived ? undefined : new Date().toISOString().split('T')[0]
      }
    };
    
    setDates(updated);
    onChange(updated);
  };

  const renderDeadlineRow = (
    label: string, 
    key: 'dueDiligence' | 'financing' | 'closing', 
    icon: React.ReactNode
  ) => {
    const item = dates[key];
    const daysRemaining = isValidDate(item.date) ? getDaysRemaining(item.date!) : null;
    const isWaived = item.status === 'waived';
    const isCompleted = item.status === 'completed';
    const statusColor = daysRemaining !== null ? getDeadlineColor(daysRemaining, isWaived || isCompleted) : 'bg-slate-50 border-slate-200';

    return (
      <div className={`p-4 rounded-xl border-2 transition-all ${statusColor} relative group`}>
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            {icon} {label}
          </div>
          <div className="flex items-center gap-2">
             {item.date && !isWaived && !isCompleted && (
               <span className={`text-xs font-black px-2 py-1 rounded-lg uppercase ${
                 (daysRemaining || 0) < 0 ? 'bg-red-200 text-red-800' : 'bg-white/50 text-slate-600'
               }`}>
                 {daysRemaining !== null && daysRemaining < 0 ? `${Math.abs(daysRemaining)} Days Overdue` : `${daysRemaining} Days Left`}
               </span>
             )}
             {key !== 'closing' && (
               <button 
                 type="button"
                 onClick={() => handleWaive(key)}
                 className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${
                   isWaived 
                     ? 'bg-slate-800 text-white hover:bg-slate-700' 
                     : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
                 }`}
               >
                 {isWaived ? <><CheckCircle2 size={12}/> Waived</> : <><ShieldOff size={12}/> Waive</>}
               </button>
             )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
           <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Timeline (Days)</label>
              <div className="relative">
                 <input 
                   type="number" 
                   value={item.days}
                   onChange={(e) => handleChange(`${key}.days`, parseInt(e.target.value) || 0)}
                   className="w-full p-2 pl-3 bg-white/80 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-summit-accent outline-none"
                   disabled={isWaived}
                 />
                 <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium pointer-events-none">Days</span>
              </div>
           </div>
           <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Target Date</label>
              <div className="relative">
                 <input 
                   type="date" 
                   value={item.date || ''}
                   readOnly
                   className="w-full p-2 pl-8 bg-slate-100/50 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 cursor-not-allowed"
                 />
                 <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
           </div>
        </div>

        {isWaived && (
           <div className="mt-3 pt-3 border-t border-slate-200/50 flex items-center gap-2 text-xs text-slate-500 font-medium">
              <CheckCircle2 size={14} className="text-green-600" /> 
              Contingency waived on {new Date(item.waivedDate || '').toLocaleDateString()}
           </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col md:flex-row gap-4 items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
               <Calendar size={24} />
            </div>
            <div>
               <h3 className="font-bold text-slate-800">Effective Date</h3>
               <p className="text-xs text-slate-500">Contract execution start point</p>
            </div>
         </div>
         <div className="relative w-full md:w-auto">
            <input 
              type="date" 
              value={dates.contractDate} 
              onChange={(e) => handleChange('contractDate', e.target.value)}
              className="w-full md:w-48 p-3 bg-white border-2 border-blue-200 rounded-xl text-slate-800 font-bold outline-none focus:border-blue-500 transition-colors"
            />
         </div>
      </div>

      {!dates.contractDate ? (
        <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
           <Clock size={40} className="mx-auto text-slate-300 mb-3" />
           <p className="text-slate-400 font-medium text-sm">Please set a contract date to generate timeline.</p>
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
           {renderDeadlineRow('Due Diligence Period', 'dueDiligence', <Search size={18} className="text-purple-500"/>)}
           {renderDeadlineRow('Financing Contingency', 'financing', <Save size={18} className="text-emerald-500"/>)}
           {renderDeadlineRow('Closing Deadline', 'closing', <CheckCircle2 size={18} className="text-blue-500"/>)}
        </div>
      )}
    </div>
  );
};

export default ContractDatesForm;
