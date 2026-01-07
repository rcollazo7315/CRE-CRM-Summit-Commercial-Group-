
import React, { useState, useEffect } from 'react';
import { Calculator, Save, Download, RefreshCw, ChevronDown, ChevronUp, DollarSign, Info, Building2, Calendar, FileText, Trash2, Loader2 } from 'lucide-react';
import { LeaseCalculation, LeaseCalculationResults, PropertyType } from '../types.ts';
import { calculateLeaseResults } from '../utils/leaseCalculations.ts';
import { api } from '../services/firestore.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { generateLeaseAnalysisReport } from '../utils/pdfGenerator.ts';

const LeaseCalculatorPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'inputs' | 'schedule'>('inputs');
  const [savedCalcs, setSavedCalcs] = useState<LeaseCalculation[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Default State
  const defaultState: LeaseCalculation = {
    id: '',
    userId: '',
    calculationName: 'New Lease Scenario',
    propertyAddress: '',
    propertyType: PropertyType.OFFICE,
    squareFootage: 2500,
    baseRentPerSqFt: 25.00,
    baseRentType: 'annual',
    leaseTerm: 60,
    leaseCommencementDate: new Date().toISOString().split('T')[0],
    escalationType: 'percentage',
    escalationAmount: 3.0,
    escalationFrequency: 'annual',
    escalationStartYear: 2,
    nnnCharges: { propertyTaxes: 4.00, insurance: 0.50, cam: 3.50 },
    nnnEscalationAmount: 2.0,
    freeRentMonths: 0,
    freeRentType: 'front_loaded',
    tenantImprovementAllowance: 0,
    parkingSpaces: 0,
    parkingCostPerSpace: 0
  };

  const [formData, setFormData] = useState<LeaseCalculation>(defaultState);
  const [results, setResults] = useState<LeaseCalculationResults | null>(null);

  // Calculate on change
  useEffect(() => {
    const res = calculateLeaseResults(formData);
    setResults(res);
  }, [formData]);

  // Load Saved
  useEffect(() => {
    if (currentUser) {
      api.getLeaseCalculations(currentUser.id).then(setSavedCalcs);
    }
  }, [currentUser, showSaved]);

  const handleChange = (field: string, value: any) => {
    const keys = field.split('.');
    if (keys.length === 2) {
      setFormData(prev => ({
        ...prev,
        [keys[0]]: { ...prev[keys[0] as keyof LeaseCalculation] as any, [keys[1]]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSave = async () => {
    if (!currentUser) return alert("Please log in.");
    const name = prompt("Name this calculation:", formData.calculationName);
    if (!name) return;
    
    const toSave = { ...formData, calculationName: name, userId: currentUser.id };
    await api.saveLeaseCalculation(toSave);
    alert("Calculation Saved!");
    setShowSaved(true);
  };

  const handleLoad = (calc: LeaseCalculation) => {
    setFormData(calc);
    setShowSaved(false);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if(confirm("Delete this calculation?")) {
        await api.deleteLeaseCalculation(id);
        setSavedCalcs(prev => prev.filter(c => c.id !== id));
    }
  };

  const handleExport = async () => {
    if (!results) return;
    setIsGenerating(true);
    try {
      const pdf = await generateLeaseAnalysisReport(formData, results, currentUser);
      pdf.save(`Lease_Analysis_${formData.propertyAddress ? formData.propertyAddress.substring(0, 20).replace(/[^a-z0-9]/gi, '_') : 'Report'}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Failed to generate PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-summit-900 text-white p-6 rounded-t-2xl shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Calculator className="text-summit-accent" /> Commercial Lease Analyzer
          </h1>
          <p className="text-slate-400 text-sm mt-1">Calculate occupancy costs, escalations, and effective rates.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowSaved(!showSaved)} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
            <FileText size={16} /> History
          </button>
          <button onClick={handleSave} className="bg-summit-accent text-summit-900 px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-400 transition-colors flex items-center gap-2">
            <Save size={16} /> Save
          </button>
          <button onClick={handleExport} disabled={isGenerating} className="bg-white text-summit-900 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-100 transition-colors flex items-center gap-2 disabled:opacity-50">
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} 
            PDF Report
          </button>
        </div>
      </div>

      {showSaved && (
        <div className="bg-slate-100 border-x border-b border-slate-200 p-4 animate-in slide-in-from-top-4">
            <h3 className="font-bold text-slate-700 mb-3">Saved Scenarios</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {savedCalcs.map(calc => (
                    <div key={calc.id} onClick={() => handleLoad(calc)} className="bg-white p-3 rounded-lg shadow-sm border border-slate-200 cursor-pointer hover:border-summit-accent flex justify-between items-center group">
                        <div>
                            <div className="font-bold text-slate-800">{calc.calculationName}</div>
                            <div className="text-xs text-slate-500">{new Date(calc.updatedAt || '').toLocaleDateString()}</div>
                        </div>
                        <button onClick={(e) => handleDelete(calc.id, e)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                    </div>
                ))}
            </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
        
        {/* LEFT COLUMN: INPUTS */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Section 1: Property & Space */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Building2 size={18} className="text-slate-400" /> Space Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Calculation Name</label>
                 <input type="text" value={formData.calculationName} onChange={e => handleChange('calculationName', e.target.value)} className="w-full p-2 border border-slate-300 rounded text-sm focus:border-summit-accent outline-none" />
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Square Footage</label>
                 <input type="number" value={formData.squareFootage} onChange={e => handleChange('squareFootage', Number(e.target.value))} className="w-full p-2 border border-slate-300 rounded text-sm focus:border-summit-accent outline-none" />
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Address</label>
                 <input type="text" value={formData.propertyAddress} onChange={e => handleChange('propertyAddress', e.target.value)} className="w-full p-2 border border-slate-300 rounded text-sm focus:border-summit-accent outline-none" placeholder="123 Main St" />
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                 <select value={formData.propertyType} onChange={e => handleChange('propertyType', e.target.value)} className="w-full p-2 border border-slate-300 rounded text-sm focus:border-summit-accent outline-none">
                    {Object.values(PropertyType).map(t => <option key={t} value={t}>{t}</option>)}
                 </select>
               </div>
            </div>
          </div>

          {/* Section 2: Term & Base Rent */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
              <DollarSign size={18} className="text-slate-400" /> Base Rent & Term
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Base Rent ($/SF)</label>
                 <div className="flex">
                    <input type="number" step="0.01" value={formData.baseRentPerSqFt} onChange={e => handleChange('baseRentPerSqFt', Number(e.target.value))} className="w-full p-2 border border-slate-300 rounded-l text-sm focus:border-summit-accent outline-none" />
                    <select value={formData.baseRentType} onChange={e => handleChange('baseRentType', e.target.value)} className="bg-slate-100 border-y border-r border-slate-300 text-xs rounded-r px-2 outline-none">
                        <option value="annual">/yr</option>
                        <option value="monthly">/mo</option>
                    </select>
                 </div>
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Lease Term (Mos)</label>
                 <input type="number" value={formData.leaseTerm} onChange={e => handleChange('leaseTerm', Number(e.target.value))} className="w-full p-2 border border-slate-300 rounded text-sm focus:border-summit-accent outline-none" />
               </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Escalation Amount</label>
                 <div className="flex">
                    <input type="number" step="0.1" value={formData.escalationAmount} onChange={e => handleChange('escalationAmount', Number(e.target.value))} className="w-full p-2 border border-slate-300 rounded-l text-sm focus:border-summit-accent outline-none" />
                    <select value={formData.escalationType} onChange={e => handleChange('escalationType', e.target.value)} className="bg-slate-100 border-y border-r border-slate-300 text-xs rounded-r px-2 outline-none">
                        <option value="percentage">%</option>
                        <option value="fixed_dollar">$</option>
                        <option value="none">None</option>
                    </select>
                 </div>
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start Year</label>
                 <input type="number" min="1" value={formData.escalationStartYear} onChange={e => handleChange('escalationStartYear', Number(e.target.value))} className="w-full p-2 border border-slate-300 rounded text-sm focus:border-summit-accent outline-none" />
               </div>
            </div>
          </div>

          {/* Section 3: NNN */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Info size={18} className="text-slate-400" /> NNN / OpEx (Annual $/SF)
            </h3>
            <div className="grid grid-cols-3 gap-4">
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Taxes</label>
                 <input type="number" step="0.01" value={formData.nnnCharges.propertyTaxes} onChange={e => handleChange('nnnCharges.propertyTaxes', Number(e.target.value))} className="w-full p-2 border border-slate-300 rounded text-sm focus:border-summit-accent outline-none" />
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Insurance</label>
                 <input type="number" step="0.01" value={formData.nnnCharges.insurance} onChange={e => handleChange('nnnCharges.insurance', Number(e.target.value))} className="w-full p-2 border border-slate-300 rounded text-sm focus:border-summit-accent outline-none" />
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">CAM</label>
                 <input type="number" step="0.01" value={formData.nnnCharges.cam} onChange={e => handleChange('nnnCharges.cam', Number(e.target.value))} className="w-full p-2 border border-slate-300 rounded text-sm focus:border-summit-accent outline-none" />
               </div>
            </div>
            <div className="mt-3 bg-slate-50 p-2 rounded flex justify-between items-center text-sm border border-slate-200">
                <span className="font-bold text-slate-600">Total NNN:</span>
                <span className="font-bold text-slate-800">${(formData.nnnCharges.propertyTaxes + formData.nnnCharges.insurance + formData.nnnCharges.cam).toFixed(2)} /sf</span>
            </div>
          </div>

          {/* Section 4: Concessions */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Calendar size={18} className="text-slate-400" /> Concessions & Extras
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Free Rent (Mos)</label>
                 <input type="number" value={formData.freeRentMonths} onChange={e => handleChange('freeRentMonths', Number(e.target.value))} className="w-full p-2 border border-slate-300 rounded text-sm focus:border-summit-accent outline-none" />
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                 <select value={formData.freeRentType} onChange={e => handleChange('freeRentType', e.target.value)} className="w-full p-2 border border-slate-300 rounded text-sm focus:border-summit-accent outline-none">
                    <option value="front_loaded">Front-Loaded</option>
                    <option value="back_loaded">Back-Loaded</option>
                 </select>
               </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Parking ($/mo total)</label>
                 <input type="number" value={formData.parkingCostPerSpace} onChange={e => handleChange('parkingCostPerSpace', Number(e.target.value))} className="w-full p-2 border border-slate-300 rounded text-sm focus:border-summit-accent outline-none" />
                 <input type="hidden" value="1" onChange={() => handleChange('parkingSpaces', 1)} /> 
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">TI Allowance ($/sf)</label>
                 <input type="number" value={formData.tenantImprovementAllowance} onChange={e => handleChange('tenantImprovementAllowance', Number(e.target.value))} className="w-full p-2 border border-slate-300 rounded text-sm focus:border-summit-accent outline-none" />
               </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: RESULTS */}
        <div className="lg:col-span-7 space-y-6">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-500 font-bold uppercase">Monthly Avg</p>
                    <p className="text-xl font-black text-slate-800 mt-1">${results?.averageMonthlyPayment.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-500 font-bold uppercase">Total Contract</p>
                    <p className="text-xl font-black text-emerald-700 mt-1">${results?.grandTotalOverTerm.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-500 font-bold uppercase">Effective Rate</p>
                    <p className="text-xl font-black text-blue-700 mt-1">${results?.effectiveRatePerSqFt.toFixed(2)}<span className="text-xs font-medium text-slate-400">/sf</span></p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-500 font-bold uppercase">Free Rent Val</p>
                    <p className="text-xl font-black text-green-700 mt-1">${results?.freeRentValue?.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                </div>
            </div>

            {/* View Toggle */}
            <div className="flex border-b border-slate-200 mb-2">
                <button onClick={() => setActiveTab('inputs')} className={`px-4 py-2 font-bold text-sm ${activeTab === 'inputs' ? 'text-summit-900 border-b-2 border-summit-900' : 'text-slate-400'}`}>Yearly Summary</button>
                <button onClick={() => setActiveTab('schedule')} className={`px-4 py-2 font-bold text-sm ${activeTab === 'schedule' ? 'text-summit-900 border-b-2 border-summit-900' : 'text-slate-400'}`}>Full Schedule</button>
            </div>

            {/* Table Area */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-[600px] overflow-y-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-xs sticky top-0 shadow-sm">
                        <tr>
                            <th className="p-3">Period</th>
                            <th className="p-3 text-right">Base Rent</th>
                            <th className="p-3 text-right">NNN</th>
                            <th className="p-3 text-right">Total</th>
                            <th className="p-3 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {activeTab === 'inputs' ? (
                            // Yearly Summary (Calculated on the fly for display)
                            Array.from({length: Math.ceil(formData.leaseTerm/12)}).map((_, i) => {
                                const year = i + 1;
                                const yearData = results?.paymentSchedule.filter(p => p.year === year);
                                if (!yearData) return null;
                                const annualTotal = yearData.reduce((sum, item) => sum + item.totalMonthly, 0);
                                const annualBase = yearData.reduce((sum, item) => sum + item.baseRent, 0);
                                const annualNNN = yearData.reduce((sum, item) => sum + item.nnn, 0);
                                
                                return (
                                    <tr key={year} className="hover:bg-slate-50">
                                        <td className="p-3 font-bold text-slate-800">Year {year}</td>
                                        <td className="p-3 text-right font-medium text-slate-600">${annualBase.toLocaleString()}</td>
                                        <td className="p-3 text-right font-medium text-slate-600">${annualNNN.toLocaleString()}</td>
                                        <td className="p-3 text-right font-bold text-summit-900">${annualTotal.toLocaleString()}</td>
                                        <td className="p-3 text-center">
                                            {yearData.some(p => p.isFreeRent) && <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Free Rent</span>}
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            // Full Monthly Schedule
                            results?.paymentSchedule.map(item => (
                                <tr key={`${item.year}-${item.month}`} className={`hover:bg-slate-50 ${item.isFreeRent ? 'bg-green-50/50' : ''}`}>
                                    <td className="p-3 border-r border-slate-100">
                                        <div className="font-bold text-slate-700">Mo {item.monthNumber}</div>
                                        <div className="text-xs text-slate-400">{new Date(item.date).toLocaleDateString(undefined, {month:'short', year:'2-digit'})}</div>
                                    </td>
                                    <td className="p-3 text-right text-slate-600">${item.baseRent.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                                    <td className="p-3 text-right text-slate-600">${item.nnn.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                                    <td className="p-3 text-right font-bold text-slate-800">${item.totalMonthly.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                                    <td className="p-3 text-center">
                                        {item.isFreeRent && <span className="text-xs text-green-600 font-bold">Free</span>}
                                        {item.isEscalation && <span className="text-xs text-blue-600 font-bold ml-1">Escalation</span>}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

        </div>
      </div>
    </div>
  );
};

export default LeaseCalculatorPage;
