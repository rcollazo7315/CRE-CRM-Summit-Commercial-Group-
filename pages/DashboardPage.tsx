import React, { useState, useMemo } from 'react';
import { Plus, ArrowUpRight, DollarSign, Clock, ChevronDown, MessageSquare, Briefcase, FileText, Download, MoreHorizontal, PieChart, MapPin } from 'lucide-react';
import { Deal, DealStatus } from '../types';
import { MOCK_ACTIVITY } from '../constants';

interface DashboardPageProps {
  activeTab: string;
  deals: Deal[];
  onAddDeal: () => void;
  onDealClick: (dealId: string) => void;
  onRouteChange: (route: string) => void;
  onOpenAi: () => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ activeTab, deals, onAddDeal, onDealClick, onRouteChange, onOpenAi }) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // -- Computed Stats --
  const activeDealsCount = deals.filter(d => d.status !== DealStatus.COMPLETED && d.status !== DealStatus.ARCHIVED).length;
  const pipelineValue = deals.reduce((acc, curr) => acc + (curr.status !== DealStatus.ARCHIVED ? curr.askingPrice : 0), 0);
  const totalOffers = deals.reduce((acc, curr) => acc + curr.offersReceived, 0);
  const avgDays = Math.round(deals.reduce((acc, curr) => acc + curr.daysOnMarket, 0) / (deals.length || 1));

  // -- Filtered Data --
  const filteredDeals = useMemo(() => {
    if (filterStatus === 'all') return deals;
    return deals.filter(d => d.status === filterStatus);
  }, [deals, filterStatus]);

  const StatsCard = ({ title, value, subtext, icon: Icon, colorClass }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-start justify-between hover:shadow-md transition-shadow">
      <div>
        <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
        {subtext && <p className="text-xs text-green-600 flex items-center mt-2 font-medium"><ArrowUpRight size={12} className="mr-1" /> {subtext}</p>}
      </div>
      <div className={`p-3 rounded-lg ${colorClass}`}>
        <Icon size={20} />
      </div>
    </div>
  );

  const ActivityFeed = () => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 h-full">
      <div className="p-5 border-b border-slate-100 flex justify-between items-center">
        <h3 className="font-bold text-slate-800">Recent Activity</h3>
        <button onClick={() => onRouteChange('communications')} className="text-xs text-summit-accent font-medium hover:underline">View All</button>
      </div>
      <div className="p-0">
        {MOCK_ACTIVITY.map((activity, idx) => (
          <div key={activity.id} className={`p-4 flex gap-3 hover:bg-slate-50 transition-colors ${idx !== MOCK_ACTIVITY.length - 1 ? 'border-b border-slate-50' : ''}`}>
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
              ${activity.type === 'offer' ? 'bg-green-100 text-green-600' : 
                activity.type === 'status' ? 'bg-blue-100 text-blue-600' : 
                activity.type === 'message' ? 'bg-purple-100 text-purple-600' : 'bg-orange-100 text-orange-600'}
            `}>
              {activity.type === 'offer' ? <DollarSign size={14} /> : 
               activity.type === 'status' ? <Briefcase size={14} /> :
               activity.type === 'message' ? <MessageSquare size={14} /> : <FileText size={14} />}
            </div>
            <div>
              <p className="text-sm text-slate-800 font-medium line-clamp-2">{activity.description}</p>
              <p className="text-xs text-slate-400 mt-1">{activity.timestamp}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const QuickActions = () => (
    <div className="bg-summit-900 rounded-xl shadow-lg text-white p-6 mb-6">
      <h3 className="font-bold mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={onAddDeal} className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 p-3 rounded-lg transition-colors text-sm font-medium">
          <Plus size={16} /> Add Deal
        </button>
        <button onClick={() => onRouteChange('reports')} className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 p-3 rounded-lg transition-colors text-sm font-medium">
          <PieChart size={16} /> Reports
        </button>
        <button onClick={() => onRouteChange('documents')} className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 p-3 rounded-lg transition-colors text-sm font-medium">
          <Download size={16} /> Docs
        </button>
        <button onClick={onOpenAi} className="flex items-center justify-center gap-2 bg-summit-accent hover:bg-emerald-400 text-summit-900 p-3 rounded-lg transition-colors text-sm font-bold">
          <MessageSquare size={16} /> AI Chat
        </button>
      </div>
    </div>
  );

  const StatusBadge = ({ status }: { status: DealStatus }) => {
    const colors = {
      [DealStatus.ACTIVE]: 'bg-green-100 text-green-700',
      [DealStatus.UNDER_REVIEW]: 'bg-blue-100 text-blue-700',
      [DealStatus.NEGOTIATING]: 'bg-amber-100 text-amber-700',
      [DealStatus.CLOSING]: 'bg-purple-100 text-purple-700',
      [DealStatus.COMPLETED]: 'bg-slate-100 text-slate-700',
      [DealStatus.ARCHIVED]: 'bg-gray-100 text-gray-500',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${colors[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      
      {/* Stats Row - Only show on Dashboard tab */}
      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard 
            title="Active Deals" 
            value={activeDealsCount} 
            subtext="+2 this month" 
            icon={Briefcase} 
            colorClass="bg-blue-100 text-blue-600" 
          />
          <StatsCard 
            title="Total Offers" 
            value={totalOffers} 
            subtext="$125M total value" 
            icon={DollarSign} 
            colorClass="bg-green-100 text-green-600" 
          />
          <StatsCard 
            title="Avg. Days on Market" 
            value={avgDays} 
            subtext="-5 days vs avg" 
            icon={Clock} 
            colorClass="bg-purple-100 text-purple-600" 
          />
           <StatsCard 
            title="Pipeline Value" 
            value={`$${(pipelineValue / 1000000).toFixed(1)}M`} 
            subtext="Weighted probability" 
            icon={ArrowUpRight} 
            colorClass="bg-orange-100 text-orange-600" 
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Main Deals Table Area */}
        <div className={`${activeTab === 'deals' ? 'col-span-4' : 'lg:col-span-3'} space-y-6`}>
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-wrap gap-4 justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800">Deal Flow</h2>
              <div className="flex gap-2">
                <div className="relative">
                  <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg pl-3 pr-8 py-2 focus:ring-summit-accent focus:border-summit-accent outline-none cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    {Object.values(DealStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                <button 
                  onClick={onAddDeal}
                  className="bg-summit-900 text-white hover:bg-summit-800 text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Plus size={16} /> New Deal
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                    <th className="p-4 rounded-tl-lg">Property</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Price</th>
                    <th className="p-4 text-center">Offers</th>
                    <th className="p-4 text-right">Highest Offer</th>
                    <th className="p-4">Last Updated</th>
                    <th className="p-4 rounded-tr-lg"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDeals.length > 0 ? (
                    filteredDeals.map((deal) => (
                      <tr 
                        key={deal.id} 
                        onClick={() => onDealClick(deal.id)}
                        className="hover:bg-slate-50 transition-colors group cursor-pointer"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <img src={deal.imageUrl} alt="Prop" className="w-12 h-12 rounded-lg object-cover" />
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">{deal.propertyAddress.split(',')[0]}</p>
                              <div className="flex items-center text-xs text-slate-500 mt-0.5">
                                <MapPin size={10} className="mr-1" />
                                {deal.propertyType}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <StatusBadge status={deal.status} />
                        </td>
                        <td className="p-4 text-right font-medium text-slate-700 text-sm">
                          ${(deal.askingPrice / 1000000).toFixed(2)}M
                        </td>
                        <td className="p-4 text-center text-slate-600 text-sm">
                          {deal.offersReceived}
                        </td>
                        <td className="p-4 text-right font-medium text-green-600 text-sm">
                          {deal.highestOffer > 0 ? `$${(deal.highestOffer / 1000000).toFixed(2)}M` : '-'}
                        </td>
                        <td className="p-4 text-xs text-slate-500">
                          {new Date(deal.lastUpdated).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-right">
                           <button className="text-slate-400 hover:text-summit-900 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             <MoreHorizontal size={18} />
                           </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 text-sm">
                        No deals found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Widgets - Hide on deals tab if full width preferred, or keep for quick access */}
        {activeTab === 'dashboard' && (
          <div className="lg:col-span-1 space-y-6">
            <QuickActions />
            <ActivityFeed />
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;