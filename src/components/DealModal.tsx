
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Sparkles, Save, Image as ImageIcon, Briefcase, Building, CheckCircle2, DollarSign, Users, Search, Clock, Calculator, UserPlus, Loader2 } from 'lucide-react';
import { PropertyType, DealStatus, Deal, LeadSource, LEAD_SOURCE_LABELS, RepresentationType, REPRESENTATION_LABELS, Contact, ContractDates } from '../types.ts';
import { generateListingDescription } from '../services/geminiService.ts';
import { calculateTotalLeaseValue } from '../utils/calculations.ts';
import ContractDatesForm from './ContractDatesForm.tsx';

interface DealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dealData: any) => void;
  initialData?: Deal | null;
  onDelete?: (dealId: string) => void;
  contacts?: Contact[];
}

// Helper to format phone number as (XXX) XXX-XXXX
const formatPhoneNumber = (value: string) => {
  if (!value) return '';
  const phoneNumber = value.replace(/\D/g, '');
  if (phoneNumber.length < 4) return phoneNumber;
  if (phoneNumber.length < 7) return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
  return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
};

const DealModal: React.FC<DealModalProps> = ({ isOpen, onClose, onSave, initialData, onDelete, contacts = [] }) => {
  const [loadingAi, setLoadingAi] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState<'basics' | 'timeline'>('basics');

  // Contact Linking State
  const [contactMode, setContactMode] = useState<'existing' | 'new'>('new');
  const [contactSearch, setContactSearch] = useState('');
  const [showContactDropdown, setShowContactDropdown] = useState(false);

  const [formData, setFormData] = useState({
    representation: 'seller' as RepresentationType,
    propertyAddress: '',
    propertyType: PropertyType.OFFICE,
    askingPrice: '' as string | number, // Target/Ask
    minSqFt: '' as string | number,
    maxSqFt: '' as string | number,
    leaseTerm: '' as string | number,
    leaseType: 'NNN',
    
    // Commission Fields
    projectedCommission: 0, 
    commissionPercentage: '' as string | number,
    commissionBasis: 'askingPrice' as 'askingPrice' | 'targetBudget' | 'totalLeaseValue',
    annualIncrease: '' as string | number,

    // Final Deal Points
    closingPrice: '' as string | number,
    closingDate: '',
    finalLeaseRate: '' as string | number,
    finalLeaseTerm: '' as string | number,
    finalLeaseType: 'NNN',
    leaseStartDate: '',
    actualCommission: '' as string | number,

    // Client Info
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    contactId: '', // For linking

    description: '',
    notes: '',
    status: DealStatus.ACTIVE,
    imageUrl: '',
    leadSource: '' as LeadSource | '',
    leadSourceNotes: '',
    
    // Contract Dates
    contractDates: undefined as ContractDates | undefined,
  });

  // Filter contacts based on search
  const filteredContacts = useMemo(() => {
    if (!contactSearch.trim()) return [];
    const term = contactSearch.toLowerCase();
    return contacts.filter(c => 
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(term) ||
      c.company?.toLowerCase().includes(term)
    ).slice(0, 5); // Limit results
  }, [contactSearch, contacts]);

  // Load initial data if editing
  useEffect(() => {
    if (initialData) {
      setFormData({
        representation: initialData.representation || 'seller', 
        propertyAddress: initialData.propertyAddress,
        propertyType: initialData.propertyType,
        askingPrice: initialData.askingPrice ? initialData.askingPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '',
        minSqFt: initialData.minSqFt || '',
        maxSqFt: initialData.maxSqFt || '',
        leaseTerm: initialData.leaseTerm || '',
        leaseType: initialData.leaseType || 'NNN',
        
        projectedCommission: initialData.projectedCommission || 0,
        commissionPercentage: initialData.commissionPercentage || '',
        commissionBasis: initialData.commissionBasis || 'askingPrice',
        annualIncrease: initialData.annualIncrease || '',

        // Load Final Points
        closingPrice: initialData.closingPrice ? initialData.closingPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '',
        closingDate: initialData.closingDate || '',
        finalLeaseRate: initialData.finalLeaseRate ? initialData.finalLeaseRate.toString() : '',
        finalLeaseTerm: initialData.finalLeaseTerm || '',
        finalLeaseType: initialData.finalLeaseType || 'NNN',
        leaseStartDate: initialData.leaseStartDate || '',
        actualCommission: initialData.actualCommission ? initialData.actualCommission.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '',

        ownerName: initialData.owner.name,
        ownerEmail: initialData.owner.email,
        ownerPhone: formatPhoneNumber(initialData.owner.phone), 
        contactId: initialData.contactId || '',

        description: initialData.description || '',
        notes: initialData.notes || '',
        status: initialData.status as DealStatus,
        imageUrl: initialData.imageUrl || '',
        leadSource: initialData.leadSource || '',
        leadSourceNotes: initialData.leadSourceNotes || '',
        
        contractDates: initialData.contractDates,
      });
      
      if (initialData.contactId) {
        setContactMode('existing');
      } else {
        setContactMode('new');
      }
    } else {
      // Reset for new deal
      setFormData({
        representation: 'seller',
        propertyAddress: '',
        propertyType: PropertyType.OFFICE,
        askingPrice: '',
        minSqFt: '',
        maxSqFt: '',
        leaseTerm: '',
        leaseType: 'NNN',
        projectedCommission: 0,
        commissionPercentage: 3,
        commissionBasis: 'askingPrice',
        annualIncrease: '',
        closingPrice: '',
        closingDate: '',
        finalLeaseRate: '',
        finalLeaseTerm: '',
        finalLeaseType: 'NNN',
        leaseStartDate: '',
        actualCommission: '',
        ownerName: '',
        ownerEmail: '',
        ownerPhone: '',
        contactId: '',
        description: '',
        notes: '',
        status: DealStatus.ACTIVE,
        imageUrl: `https://picsum.photos/400/300?random=${Math.floor(Math.random() * 100)}`,
        leadSource: '',
        leadSourceNotes: '',
        contractDates: undefined,
      });
      setContactMode('new');
      setActiveTab('basics');
    }
  }, [initialData, isOpen]);

  // Determine role context
  const isDemandSide = formData.representation === 'buyer' || formData.representation === 'tenant';
  const isLeasing = formData.representation === 'landlord' || formData.representation === 'tenant';

  // --- Real-time Commission Calculation ---
  useEffect(() => {
    let baseValue = 0;
    const commPercent = parseFloat(formData.commissionPercentage.toString()) || 0;

    if (isLeasing) {
        // Calculate Total Lease Value
        // Assuming 'askingPrice' field is being used as Monthly Rent for leasing UI simplicity
        const monthlyRent = parseFloat(formData.askingPrice.toString().replace(/,/g, '')) || 0;
        const term = parseFloat(formData.leaseTerm.toString()) || 0;
        const increase = parseFloat(formData.annualIncrease.toString()) || 0;
        
        // Term in months usually, but input might be years.
        const termMonths = term * 12; 
        
        if (monthlyRent > 0 && termMonths > 0) {
            baseValue = calculateTotalLeaseValue(monthlyRent, termMonths, increase);
        }
    } else {
        // Sales
        baseValue = parseFloat(formData.askingPrice.toString().replace(/,/g, '')) || 0;
    }

    const projected = baseValue * (commPercent / 100);
    setFormData(prev => ({ ...prev, projectedCommission: projected }));

  }, [
    formData.askingPrice, 
    formData.leaseTerm, 
    formData.annualIncrease, 
    formData.commissionPercentage, 
    isLeasing
  ]);


  if (!isOpen) return null;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData(prev => ({ ...prev, ownerPhone: formatted }));
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    let val = e.target.value.replace(/[^0-9.]/g, '');
    const parts = val.split('.');
    if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  const handleCurrencyBlur = (field: string) => {
    const val = (formData as any)[field];
    if (!val) return;
    const num = parseFloat(val.toString().replace(/,/g, ''));
    if (!isNaN(num)) {
      setFormData(prev => ({
        ...prev,
        [field]: num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleContractDatesChange = (updatedDates: ContractDates) => {
    setFormData(prev => ({ ...prev, contractDates: updatedDates }));
  };

  const handleSelectContact = (contact: Contact) => {
    setFormData(prev => ({
      ...prev,
      ownerName: `${contact.firstName} ${contact.lastName}`,
      ownerEmail: contact.email || '',
      ownerPhone: contact.phone || contact.mobile || '',
      contactId: contact.id
    }));
    setContactSearch('');
    setShowContactDropdown(false);
  };

  const handleAiGenerate = async () => {
    if (!formData.propertyAddress || !formData.askingPrice) {
      return;
    }
    const cleanPrice = parseFloat(formData.askingPrice.toString().replace(/,/g, ''));
    setLoadingAi(true);
    
    let highlights = formData.notes || "Standard commercial features";
    if (isDemandSide) {
        highlights += ` Client is looking for: ${formData.minSqFt}-${formData.maxSqFt} sqft.`;
    }
    if (isLeasing) {
        highlights += ` Lease Type: ${formData.leaseType}, Term: ${formData.leaseTerm} years.`;
    }

    const desc = await generateListingDescription(
      formData.propertyAddress,
      formData.propertyType,
      cleanPrice,
      highlights
    );
    setFormData(prev => ({ ...prev, description: desc }));
    setLoadingAi(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAsking = parseFloat(formData.askingPrice.toString().replace(/,/g, ''));
    const numericClosing = formData.closingPrice ? parseFloat(formData.closingPrice.toString().replace(/,/g, '')) : null;
    const numericCommission = formData.actualCommission ? parseFloat(formData.actualCommission.toString().replace(/,/g, '')) : null;
    const numericFinalRate = formData.finalLeaseRate ? parseFloat(formData.finalLeaseRate.toString()) : null;

    const dealPayload = {
      ...initialData,
      representation: formData.representation,
      propertyAddress: formData.propertyAddress,
      propertyType: formData.propertyType,
      askingPrice: numericAsking, 
      minSqFt: formData.minSqFt ? parseFloat(formData.minSqFt.toString()) : null,
      maxSqFt: formData.maxSqFt ? parseFloat(formData.maxSqFt.toString()) : null,
      leaseTerm: formData.leaseTerm ? parseFloat(formData.leaseTerm.toString()) : null,
      leaseType: formData.leaseType,
      
      // Commission Data
      projectedCommission: formData.projectedCommission,
      commissionPercentage: parseFloat(formData.commissionPercentage.toString()) || 0,
      commissionBasis: formData.commissionBasis,
      annualIncrease: parseFloat(formData.annualIncrease.toString()) || 0,
      
      // Final Points
      closingPrice: numericClosing,
      closingDate: formData.closingDate || null,
      finalLeaseRate: numericFinalRate,
      finalLeaseTerm: formData.finalLeaseTerm ? parseFloat(formData.finalLeaseTerm.toString()) : null,
      finalLeaseType: formData.finalLeaseType,
      leaseStartDate: formData.leaseStartDate || null,
      actualCommission: numericCommission,

      status: formData.status,
      description: formData.description,
      notes: formData.notes,
      imageUrl: formData.imageUrl,
      
      // Client info & link
      owner: {
        name: formData.ownerName,
        email: formData.ownerEmail,
        phone: formData.ownerPhone 
      },
      contactId: formData.contactId || null,

      id: initialData?.id || Math.random().toString(36).substr(2, 9),
      offersReceived: initialData?.offersReceived || 0,
      highestOffer: initialData?.highestOffer || 0,
      daysOnMarket: initialData?.daysOnMarket || 0,
      lastUpdated: new Date().toISOString(),
      documents: initialData?.documents || [],
      leadSource: formData.leadSource || null,
      leadSourceNotes: formData.leadSourceNotes || '',
      
      contractDates: formData.contractDates,
    };

    onSave(dealPayload);
    onClose();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
             <div className={`p-2 rounded-lg ${isDemandSide ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                {isDemandSide ? <Briefcase size={20} /> : <Building size={20} />}
             </div>
             <div>
                <h2 className="text-xl font-bold text-slate-800">
                    {initialData ? 'Edit Deal Details' : 'New Deal Registration'}
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                    {REPRESENTATION_LABELS[formData.representation]}
                </p>
             </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-2 border-b border-slate-100 flex gap-6 sticky top-[88px] bg-white z-10">
           <button 
             onClick={() => setActiveTab('basics')}
             className={`pb-3 font-bold text-sm transition-all border-b-2 ${activeTab === 'basics' ? 'border-summit-900 text-summit-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
           >
             Deal Basics
           </button>
           <button 
             onClick={() => setActiveTab('timeline')}
             className={`pb-3 font-bold text-sm transition-all border-b-2 flex items-center gap-2 ${activeTab === 'timeline' ? 'border-summit-900 text-summit-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
           >
             <Clock size={14} /> Contract Timeline
           </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          
          {activeTab === 'basics' ? (
            <div className="space-y-6">
              {/* Representation Selector */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                 <label className="block text-xs font-black text-slate-500 uppercase tracking-wide mb-2">I am representing the:</label>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {Object.entries(REPRESENTATION_LABELS).map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, representation: key as RepresentationType }))}
                            className={`text-sm py-2 px-3 rounded-lg border transition-all ${
                                formData.representation === key 
                                ? 'bg-white border-summit-accent text-summit-900 shadow-sm ring-1 ring-summit-accent' 
                                : 'bg-slate-100 border-transparent text-slate-500 hover:bg-white hover:border-slate-300'
                            }`}
                        >
                            {label.split(' ')[0]}
                        </button>
                    ))}
                 </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100 pb-2">
                    {isDemandSide ? 'Requirement Criteria' : 'Property Details'}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        {isDemandSide ? 'Target Location / Search Area' : 'Property Address'}
                    </label>
                    <input 
                      required
                      name="propertyAddress"
                      value={formData.propertyAddress}
                      onChange={handleChange}
                      type="text" 
                      className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-summit-accent focus:border-summit-accent outline-none"
                      placeholder={isDemandSide ? "e.g. Downtown, Medical District" : "e.g. 123 Business Park Dr"}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Asset Type</label>
                    <select 
                      name="propertyType"
                      value={formData.propertyType}
                      onChange={handleChange}
                      className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-summit-accent focus:border-summit-accent outline-none"
                    >
                      {Object.values(PropertyType).map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Price & Size Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        {isLeasing ? 'Monthly Rent' : (isDemandSide ? 'Max Purchase Budget' : 'Asking Price')}
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                        <input 
                        required
                        name="askingPrice"
                        value={formData.askingPrice}
                        onChange={(e) => handleCurrencyChange(e, 'askingPrice')}
                        onBlur={() => handleCurrencyBlur('askingPrice')}
                        type="text" 
                        className="w-full pl-7 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-summit-accent outline-none"
                        placeholder="0.00"
                        />
                    </div>
                  </div>
                  
                  {isDemandSide ? (
                      <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Min SqFt</label>
                            <input 
                                name="minSqFt"
                                type="number"
                                value={formData.minSqFt}
                                onChange={handleChange}
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-summit-accent outline-none"
                                placeholder="Min"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Max SqFt</label>
                            <input 
                                name="maxSqFt"
                                type="number"
                                value={formData.maxSqFt}
                                onChange={handleChange}
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-summit-accent outline-none"
                                placeholder="Max"
                            />
                          </div>
                      </div>
                  ) : (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                        <select 
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-summit-accent outline-none"
                        >
                        {Object.values(DealStatus).map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                        </select>
                    </div>
                  )}
                </div>

                {/* Target Lease Parameters */}
                {isLeasing && (
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <div className="text-xs font-black text-slate-500 uppercase tracking-wide border-b border-slate-200 pb-1 mb-3">Lease Structure</div>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Term (Years)</label>
                                <input 
                                    name="leaseTerm"
                                    type="number"
                                    value={formData.leaseTerm}
                                    onChange={handleChange}
                                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                                    placeholder="e.g. 5"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                                <select 
                                    name="leaseType"
                                    value={formData.leaseType}
                                    onChange={handleChange}
                                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                                >
                                    <option value="NNN">Triple Net (NNN)</option>
                                    <option value="Gross">Gross</option>
                                    <option value="MG">Modified Gross</option>
                                    <option value="FS">Full Service</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Annual Incr. %</label>
                                <div className="relative">
                                    <input 
                                        name="annualIncrease"
                                        type="number"
                                        step="0.1"
                                        value={formData.annualIncrease}
                                        onChange={handleChange}
                                        className="w-full p-2.5 border border-slate-300 rounded-lg outline-none"
                                        placeholder="3.0"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* PROJECTED COMMISSION SECTION */}
                <div className="bg-emerald-50/50 p-4 rounded-lg border border-emerald-100">
                  <div className="flex items-center justify-between mb-3">
                     <h3 className="text-xs font-black text-emerald-800 uppercase tracking-wide flex items-center gap-2">
                        <Calculator size={14} /> Commission Projection
                     </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Commission Rate</label>
                        <div className="relative">
                            <input 
                                name="commissionPercentage"
                                type="number"
                                step="0.1"
                                value={formData.commissionPercentage}
                                onChange={handleChange}
                                className="w-full p-2.5 border border-emerald-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder="3.0"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                        </div>
                     </div>
                     {!isLeasing && (
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Basis</label>
                            <select 
                                name="commissionBasis"
                                value={formData.commissionBasis}
                                onChange={(e) => setFormData(p => ({...p, commissionBasis: e.target.value as any}))}
                                className="w-full p-2.5 border border-emerald-200 rounded-lg outline-none bg-white"
                            >
                                <option value="askingPrice">Asking Price</option>
                                <option value="targetBudget">Target Budget</option>
                            </select>
                         </div>
                     )}
                  </div>
                  
                  <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-emerald-100 shadow-sm">
                      <span className="text-sm font-medium text-slate-500">Projected Gross:</span>
                      <span className="text-lg font-bold text-emerald-700">
                        ${formData.projectedCommission.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </span>
                  </div>
                  {isLeasing && (
                      <p className="text-[10px] text-slate-400 mt-2 text-right">
                          Based on total lease value over {formData.leaseTerm || 0} years with {formData.annualIncrease || 0}% annual increases.
                      </p>
                  )}
                </div>
              </div>

              {/* FINAL DEAL POINTS SECTION - Emphasized when relevant */}
              <div className={`space-y-4 rounded-xl p-5 border-2 ${['Negotiating', 'Closing', 'Completed'].includes(formData.status) ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-100'}`}>
                 <h3 className={`text-sm font-black uppercase tracking-wide flex items-center gap-2 ${['Negotiating', 'Closing', 'Completed'].includes(formData.status) ? 'text-green-800' : 'text-slate-500'}`}>
                   <CheckCircle2 size={18} /> Final Agreement & Closing Details
                 </h3>
                 
                 {isLeasing ? (
                   // LEASING FINAL TERMS
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Final Lease Rate ($/sf/yr)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                          <input name="finalLeaseRate" type="number" step="0.01" value={formData.finalLeaseRate} onChange={handleChange} className="w-full pl-7 p-2.5 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500" placeholder="0.00" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Final Term (Years/Mos)</label>
                        <input name="finalLeaseTerm" type="text" value={formData.finalLeaseTerm} onChange={handleChange} className="w-full p-2.5 bg-white border border-slate-300 rounded-lg outline-none" placeholder="e.g. 60 Months" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Final Lease Type</label>
                        <select name="finalLeaseType" value={formData.finalLeaseType} onChange={handleChange} className="w-full p-2.5 bg-white border border-slate-300 rounded-lg outline-none">
                           <option value="NNN">Triple Net (NNN)</option>
                           <option value="Gross">Gross</option>
                           <option value="MG">Modified Gross</option>
                           <option value="FS">Full Service</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Commencement Date</label>
                        <input name="leaseStartDate" type="date" value={formData.leaseStartDate} onChange={handleChange} className="w-full p-2.5 bg-white border border-slate-300 rounded-lg outline-none" />
                      </div>
                   </div>
                 ) : (
                   // SALES FINAL TERMS
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Final Contract Price</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                          <input name="closingPrice" value={formData.closingPrice} onChange={(e) => handleCurrencyChange(e, 'closingPrice')} onBlur={() => handleCurrencyBlur('closingPrice')} type="text" className="w-full pl-7 p-2.5 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500" placeholder="0.00" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Closing Date</label>
                        <input name="closingDate" type="date" value={formData.closingDate} onChange={handleChange} className="w-full p-2.5 bg-white border border-slate-300 rounded-lg outline-none" />
                      </div>
                   </div>
                 )}

                 {/* Commission - Universal */}
                 <div className="pt-2 border-t border-slate-200/50">
                   <label className="block text-sm font-medium text-slate-700 mb-1">Total Commission Amount (Gross)</label>
                   <div className="relative w-full md:w-1/2">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"><DollarSign size={14}/></span>
                      <input name="actualCommission" value={formData.actualCommission} onChange={(e) => handleCurrencyChange(e, 'actualCommission')} onBlur={() => handleCurrencyBlur('actualCommission')} type="text" className="w-full pl-8 p-2.5 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500 font-medium text-green-700" placeholder="0.00" />
                   </div>
                 </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100 pb-2 flex justify-between items-center">
                    <span>{isDemandSide ? 'Client Information' : 'Owner Information'}</span>
                    {formData.contactId && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center gap-1"><Users size={12}/> Linked</span>}
                </h3>
                
                {/* Mode Switcher */}
                <div className="flex gap-4 border-b border-slate-100 mb-4">
                  <button 
                    type="button" 
                    className={`pb-2 text-xs font-bold uppercase tracking-wider transition-colors ${contactMode === 'new' ? 'text-summit-900 border-b-2 border-summit-900' : 'text-slate-400 hover:text-slate-600'}`}
                    onClick={() => { setContactMode('new'); setFormData(p => ({...p, contactId: ''})); }}
                  >
                    Manual Entry
                  </button>
                  <button 
                    type="button" 
                    className={`pb-2 text-xs font-bold uppercase tracking-wider transition-colors ${contactMode === 'existing' ? 'text-summit-900 border-b-2 border-summit-900' : 'text-slate-400 hover:text-slate-600'}`}
                    onClick={() => setContactMode('existing')}
                  >
                    Link Contact
                  </button>
                </div>

                {/* Link Existing Contact Input */}
                {contactMode === 'existing' && (
                  <div className="relative mb-6">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Search Contacts</label>
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        className="w-full pl-10 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-summit-accent outline-none"
                        placeholder="Type name or company..."
                        value={contactSearch}
                        onChange={e => { setContactSearch(e.target.value); setShowContactDropdown(true); }}
                        onFocus={() => setShowContactDropdown(true)}
                      />
                    </div>
                    {showContactDropdown && contactSearch && (
                      <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                        {filteredContacts.length > 0 ? filteredContacts.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleSelectContact(c)}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex justify-between items-center group"
                          >
                            <div>
                              <div className="font-bold text-slate-800">{c.firstName} {c.lastName}</div>
                              <div className="text-xs text-slate-500">{c.company}</div>
                            </div>
                            <UserPlus size={16} className="text-slate-300 group-hover:text-summit-accent" />
                          </button>
                        )) : (
                          <div className="p-3 text-sm text-slate-400 text-center">No matching contacts found.</div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name / Entity</label>
                    <input 
                      required
                      name="ownerName"
                      value={formData.ownerName}
                      onChange={handleChange}
                      type="text" 
                      disabled={contactMode === 'existing' && !!formData.contactId}
                      className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-summit-accent disabled:bg-slate-50 disabled:text-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input 
                      name="ownerEmail"
                      value={formData.ownerEmail}
                      onChange={handleChange}
                      type="email" 
                      disabled={contactMode === 'existing' && !!formData.contactId}
                      className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-summit-accent disabled:bg-slate-50 disabled:text-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                    <input 
                      name="ownerPhone"
                      value={formData.ownerPhone}
                      onChange={handlePhoneChange}
                      maxLength={14}
                      placeholder="(555) 555-5555"
                      type="tel" 
                      disabled={contactMode === 'existing' && !!formData.contactId}
                      className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-summit-accent disabled:bg-slate-50 disabled:text-slate-500"
                    />
                  </div>
                </div>
              </div>

              {/* Lead Source Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100 pb-2">
                  Lead Source Attribution
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      How was this deal sourced? 
                      {(formData.status === DealStatus.COMPLETED) && <span className="text-red-500">*</span>}
                    </label>
                    <select
                      name="leadSource"
                      value={formData.leadSource}
                      onChange={handleChange}
                      required={formData.status === DealStatus.COMPLETED}
                      className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-summit-accent focus:border-summit-accent outline-none"
                    >
                      <option value="">Select source...</option>
                      {Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Source Notes</label>
                    <input
                      name="leadSourceNotes"
                      value={formData.leadSourceNotes}
                      onChange={handleChange}
                      type="text"
                      placeholder="e.g., Met at ICSC conference, Referred by John Smith"
                      className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-summit-accent"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                 <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                      {isDemandSide ? 'Requirement Details / Brief' : 'Listing Description'}
                  </h3>
                  <button 
                    type="button"
                    onClick={handleAiGenerate}
                    disabled={loadingAi}
                    className="flex items-center text-xs bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full hover:bg-purple-200 transition-colors disabled:opacity-50 font-medium"
                  >
                    {loadingAi ? <Loader2 size={14} className="animate-spin mr-1" /> : <Sparkles size={14} className="mr-1" />}
                    {loadingAi ? 'Thinking...' : 'Generate with AI'}
                  </button>
                </div>
                
                <textarea 
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  placeholder={isDemandSide ? "Describe client requirements, preferred submarkets, must-haves..." : "Enter property description or use AI to generate..."}
                  className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-summit-accent"
                />
                
                 <textarea 
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Internal notes (e.g. 'Client is motivated', 'Lease expires in 6 months')..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none"
                />
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Deal Photo</label>
                  <div className="flex items-center gap-4">
                    <img src={formData.imageUrl || 'https://via.placeholder.com/100'} alt="Preview" className="w-20 h-20 rounded-lg object-cover border border-slate-200" />
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2"
                    >
                      <ImageIcon size={16} /> Change Photo
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Contract Timeline Tab
            <ContractDatesForm 
              deal={{ contractDates: formData.contractDates }} 
              onChange={handleContractDatesChange}
            />
          )}

          <div className="flex justify-end pt-6 border-t border-slate-100 gap-3 mt-4">
            <button 
              type="button" 
              onClick={onClose}
              className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-6 py-2.5 rounded-lg bg-summit-900 text-white hover:bg-summit-800 font-medium shadow-lg shadow-summit-900/20 transition-all transform hover:-translate-y-0.5 flex items-center"
            >
              <Save size={18} className="mr-2" />
              {initialData ? 'Update Deal' : 'Create Deal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DealModal;
