
import React, { useMemo } from 'react';
import { Deal, LeadSource, LEAD_SOURCE_LABELS, LeadGenLog } from '../types.ts';
import { TrendingUp, Target, DollarSign, Clock, PieChart } from 'lucide-react';

interface KpiDashboardProps {
  deals: Deal[];
  logs: LeadGenLog[];
  timeframe?: 'monthly' | 'quarterly' | 'yearly' | 'all';
}

const KpiDashboard: React.FC<KpiDashboardProps> = ({ deals, logs, timeframe = 'all' }) => {
  
  const kpis = useMemo(() => {
    const closedDeals = deals.filter(d => d.status === 'Completed');
    
    // Deals by source
    const dealsBySource: Record<string, number> = {};
    const revenueBySource: Record<string, number> = {};
    
    closedDeals.forEach(deal => {
      const source = deal.leadSource || 'other';
      dealsBySource[source] = (dealsBySource[source] || 0) + 1;
      revenueBySource[source] = (revenueBySource[source] || 0) + (deal.closingPrice || deal.askingPrice);
    });

    // Calculate total activities from logs
    const totalActivities = logs.reduce((acc, log) => ({
      calls: acc.calls + (log.callsMade || 0),
      emails: acc.emails + (log.targetedEmails || 0),
      meetings: acc.meetings + (log.clientMeetings || 0),
      referrals: acc.referrals + (log.referralsGenerated || 0),
    }), { calls: 0, emails: 0, meetings: 0, referrals: 0 });

    // Conversion rates
    const totalOutreach = totalActivities.calls + totalActivities.emails;
    const conversionRate = totalOutreach > 0 
      ? ((closedDeals.length / totalOutreach) * 100).toFixed(2) 
      : '0.00';

    // Best performing source
    const bestSource = Object.entries(revenueBySource)
      .sort(([,a], [,b]) => b - a)[0];

    return {
      totalClosed: closedDeals.length,
      totalRevenue: closedDeals.reduce((acc, d) => acc + (d.closingPrice || d.askingPrice), 0),
      dealsBySource,
      revenueBySource,
      conversionRate,
      bestSource: bestSource ? { source: bestSource[0] as LeadSource, revenue: bestSource[1] } : null,
      totalActivities,
    };
  }, [deals, logs]);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="text-green-600" size={20} />
            </div>
            <span className="text-sm font-medium text-slate-500">Total Revenue</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{formatCurrency(kpis.totalRevenue)}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="text-blue-600" size={20} />
            </div>
            <span className="text-sm font-medium text-slate-500">Deals Closed</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{kpis.totalClosed}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="text-purple-600" size={20} />
            </div>
            <span className="text-sm font-medium text-slate-500">Conversion Rate</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{kpis.conversionRate}%</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-100 rounded-lg">
              <PieChart className="text-amber-600" size={20} />
            </div>
            <span className="text-sm font-medium text-slate-500">Top Source</span>
          </div>
          <p className="text-lg font-bold text-slate-800">
            {kpis.bestSource ? (LEAD_SOURCE_LABELS[kpis.bestSource.source] || kpis.bestSource.source) : 'N/A'}
          </p>
          {kpis.bestSource && (
            <p className="text-xs text-slate-500">{formatCurrency(kpis.bestSource.revenue)}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Source Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 className="font-bold text-slate-800 mb-4">Revenue by Lead Source</h3>
          <div className="space-y-3">
            {Object.keys(kpis.revenueBySource).length > 0 ? Object.entries(kpis.revenueBySource)
              .sort(([,a], [,b]) => (b as number) - (a as number))
              .map(([source, revenue]) => {
                const percentage = ((revenue as number) / (kpis.totalRevenue as number)) * 100;
                return (
                  <div key={source} className="flex items-center gap-4">
                    <div className="w-32 text-sm font-medium text-slate-600 truncate" title={LEAD_SOURCE_LABELS[source as LeadSource] || source}>
                      {LEAD_SOURCE_LABELS[source as LeadSource] || source}
                    </div>
                    <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                      <div 
                        className="bg-summit-accent h-full rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="w-24 text-right text-sm font-semibold text-slate-700">
                      {formatCurrency(revenue as number)}
                    </div>
                    <div className="w-16 text-right text-xs text-slate-500">
                      {percentage.toFixed(1)}%
                    </div>
                  </div>
                );
              }) : (
                <p className="text-slate-400 text-center py-8">No attribution data available.</p>
              )}
          </div>
        </div>

        {/* Activity to Close Funnel */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 className="font-bold text-slate-800 mb-4">Activity Funnel</h3>
          <div className="flex flex-col gap-4">
            {[
              { label: 'Outreach (Calls/Emails)', value: kpis.totalActivities.calls + kpis.totalActivities.emails, color: 'bg-blue-500' },
              { label: 'Meetings', value: kpis.totalActivities.meetings, color: 'bg-purple-500' },
              { label: 'Referrals', value: kpis.totalActivities.referrals, color: 'bg-pink-500' },
              { label: 'Closed Deals', value: kpis.totalClosed, color: 'bg-green-500' },
            ].map((item, idx, arr) => (
              <div key={item.label} className="relative">
                <div 
                  className={`${item.color} text-white rounded-lg p-4 flex justify-between items-center transition-all`}
                  style={{ width: `${Math.max(20, (item.value / Math.max(1, arr[0].value)) * 100)}%` }}
                >
                  <span className="font-bold whitespace-nowrap">{item.label}</span>
                  <span className="bg-white/20 px-2 py-1 rounded text-xs font-bold">{item.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KpiDashboard;
