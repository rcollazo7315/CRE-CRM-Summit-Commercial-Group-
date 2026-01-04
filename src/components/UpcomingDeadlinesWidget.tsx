
import React from 'react';
import { Clock, AlertTriangle, CheckCircle2, ChevronRight, Calendar } from 'lucide-react';
import { Deal, DealStatus } from '../types.ts';
import { getDaysRemaining, getUrgencyColorClass, isValidDate } from '../utils/dateUtils.ts';

interface UpcomingDeadlinesWidgetProps {
  deals: Deal[];
  onDealClick: (dealId: string) => void;
}

interface DeadlineItem {
  dealId: string;
  address: string;
  type: string;
  date: string;
  daysRemaining: number;
  urgencyColor: string;
}

const UpcomingDeadlinesWidget: React.FC<UpcomingDeadlinesWidgetProps> = ({ deals, onDealClick }) => {
  // Extract and flatten active deadlines
  const deadlines: DeadlineItem[] = deals
    .filter(d => d.status !== DealStatus.COMPLETED && d.status !== DealStatus.ARCHIVED && d.status !== DealStatus.CLOSED_LOST && d.contractDates?.contractDate)
    .flatMap(deal => {
      const dates = deal.contractDates!;
      const items: DeadlineItem[] = [];

      const check = (type: 'dueDiligence' | 'financing' | 'closing', label: string) => {
        const item = dates[type];
        if (item && item.status === 'pending' && isValidDate(item.date)) {
          const days = getDaysRemaining(item.date!);
          // Only show deadlines that are coming up (within 30 days) or overdue
          if (days <= 30) {
            items.push({
              dealId: deal.id,
              address: deal.propertyAddress,
              type: label,
              date: item.date!,
              daysRemaining: days,
              urgencyColor: getUrgencyColorClass(days)
            });
          }
        }
      };

      check('dueDiligence', 'Due Diligence');
      check('financing', 'Financing');
      check('closing', 'Closing');

      return items;
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining) // Sort by most urgent
    .slice(0, 5); // Take top 5

  if (deadlines.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-full flex flex-col justify-center items-center text-center">
         <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-3">
            <CheckCircle2 size={24} />
         </div>
         <h3 className="font-bold text-slate-800">No Pending Deadlines</h3>
         <p className="text-xs text-slate-500 mt-1">All active contract timelines are clear for the next 30 days.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Clock size={20} className="text-summit-900" /> Contract Critical Dates
        </h3>
        <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded-full text-slate-500">{deadlines.length} Due</span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
        {deadlines.map((item, idx) => (
          <div 
            key={`${item.dealId}-${idx}`} 
            onClick={() => onDealClick(item.dealId)}
            className="group flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:border-summit-accent/30 hover:bg-slate-50 transition-all cursor-pointer"
          >
            <div className={`w-2 h-10 rounded-full flex-shrink-0 ${item.urgencyColor}`} />
            
            <div className="flex-1 min-w-0">
               <div className="flex justify-between items-start">
                  <p className="font-bold text-sm text-slate-800 truncate group-hover:text-summit-accent transition-colors">
                    {item.address}
                  </p>
                  <span className={`text-[10px] font-black uppercase tracking-wider ${
                    item.daysRemaining < 0 ? 'text-red-600' : 
                    item.daysRemaining <= 3 ? 'text-red-500' : 'text-emerald-600'
                  }`}>
                    {item.daysRemaining < 0 ? 'Overdue' : `${item.daysRemaining} Days`}
                  </span>
               </div>
               
               <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                    {item.daysRemaining <= 3 && item.daysRemaining >= 0 && <AlertTriangle size={12} className="text-red-500" />}
                    {item.type}
                  </span>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Calendar size={10} />
                    {new Date(item.date).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                  </span>
               </div>
            </div>
            
            <ChevronRight size={16} className="text-slate-300 group-hover:text-summit-accent mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default UpcomingDeadlinesWidget;
