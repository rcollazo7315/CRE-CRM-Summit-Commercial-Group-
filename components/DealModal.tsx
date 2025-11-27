
import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Upload, Loader2, Save, Image as ImageIcon } from 'lucide-react';
import { PropertyType, DealStatus, Deal } from '../types';
import { generateListingDescription } from '../services/geminiService';

interface DealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dealData: any) => void;
  initialData?: Deal | null;
}

const DealModal: React.FC<DealModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [loadingAi, setLoadingAi] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    propertyAddress: '',
    propertyType: PropertyType.OFFICE,
    askingPrice: '' as string | number,
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    description: '',
    notes: '',
    status: DealStatus.ACTIVE,
    imageUrl: ''
  });

  // Load initial data if editing
  useEffect(() => {
    if (initialData) {
      setFormData({
        propertyAddress: initialData.propertyAddress,
        propertyType: initialData.propertyType,
        askingPrice: initialData.askingPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}),
        ownerName: initialData.owner.name,
        ownerEmail: initialData.owner.email,
        ownerPhone: initialData.owner.phone,
        description: initialData.description,
        notes: initialData.notes || '',
        status: initialData.status,
        imageUrl: initialData.imageUrl
      });
    } else {
      // Reset for new deal
      setFormData({
        propertyAddress: '',
        propertyType: PropertyType.OFFICE,
        askingPrice: '',
        ownerName: '',
        ownerEmail: '',
        ownerPhone: '',
        description: '',
        notes: '',
        status: DealStatus.ACTIVE,
        imageUrl: `https://picsum.photos/400/300?random=${Math.floor(Math.random() * 100)}`
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const formatPhoneNumber = (value: string) => {
    // Strip all non-numeric characters
    const phoneNumber = value.replace(/\D/g, '');
    
    // Format based on length
    if (phoneNumber.length < 4) return phoneNumber;
    if (phoneNumber.length < 7) return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData(prev => ({ ...prev, ownerPhone: formatted }));
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove non-numeric/decimal chars first to clean input
    let val = e.target.value.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimals
    const parts = val.split('.');
    if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
    
    setFormData(prev => ({ ...prev, askingPrice: val }));
  };

  const handlePriceBlur = () => {
    if (!formData.askingPrice) return;
    const num = parseFloat(formData.askingPrice.toString());
    if (!isNaN(num)) {
      setFormData(prev => ({
        ...prev,
        askingPrice: num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormData(prev => ({ ...prev, imageUrl: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAiGenerate = async () => {
    if (!formData.propertyAddress || !formData.askingPrice) {
      alert("Please enter at least address and price to generate a description.");
      return;
    }
    
    const cleanPrice = parseFloat(formData.askingPrice.toString().replace(/,/g, ''));

    setLoadingAi(true);
    const desc = await generateListingDescription(
      formData.propertyAddress,
      formData.propertyType,
      cleanPrice,
      formData.notes || "Standard commercial features"
    );
    setFormData(prev => ({ ...prev, description: desc }));
    setLoadingAi(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Parse price back to number
    const numericPrice = parseFloat(formData.askingPrice.toString().replace(/,/g, ''));

    const dealPayload = {
      ...initialData, // Keep existing ID/dates if editing
      propertyAddress: formData.propertyAddress,
      propertyType: formData.propertyType,
      askingPrice: numericPrice,
      status: formData.status,
      description: formData.description,
      notes: formData.notes,
      imageUrl: formData.imageUrl,
      owner: {
        name: formData.ownerName,
        email: formData.ownerEmail,
        phone: formData.ownerPhone
      },
      // Defaults for new deals if ID doesn't exist
      id: initialData?.id || Math.random().toString(36).substr(2, 9),
      offersReceived: initialData?.offersReceived || 0,
      highestOffer: initialData?.highestOffer || 0,
      daysOnMarket: initialData?.daysOnMarket || 0,
      lastUpdated: new Date().toISOString(),
      documents: initialData?.documents || [],
    };

    onSave(dealPayload);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">
            {initialData ? 'Edit Deal Details' : 'New Deal Registration'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Property Info Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100 pb-2">Property Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Property Address</label>
                <input 
                  required
                  name="propertyAddress"
                  value={formData.propertyAddress}
                  onChange={handleChange}
                  type="text" 
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-summit-accent focus:border-summit-accent outline-none"
                  placeholder="e.g. 123 Business Park Dr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Property Type</label>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Asking Price</label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                    <input 
                    required
                    name="askingPrice"
                    value={formData.askingPrice}
                    onChange={handlePriceChange}
                    onBlur={handlePriceBlur}
                    type="text" 
                    className="w-full pl-7 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-summit-accent focus:border-summit-accent outline-none"
                    placeholder="5,000,000.00"
                    />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select 
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-summit-accent focus:border-summit-accent outline-none"
                >
                  {Object.values(DealStatus).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Deal Photo Upload */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Deal Photo</label>
              <div className="flex items-center gap-4">
                <img src={formData.imageUrl} alt="Preview" className="w-20 h-20 rounded-lg object-cover border border-slate-200" />
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

          {/* Owner Info Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100 pb-2">Owner Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name / Entity</label>
                <input 
                  required
                  name="ownerName"
                  value={formData.ownerName}
                  onChange={handleChange}
                  type="text" 
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-summit-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input 
                  name="ownerEmail"
                  value={formData.ownerEmail}
                  onChange={handleChange}
                  type="email" 
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-summit-accent"
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
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-summit-accent"
                />
              </div>
            </div>
          </div>

          {/* Description Section with AI */}
          <div className="space-y-4">
             <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Listing Description</h3>
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
              placeholder="Enter property description or use AI to generate..."
              className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-summit-accent"
            />
            
             <textarea 
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={2}
              placeholder="Internal notes or key highlights for AI context (e.g., 'Newly renovated lobby, 95% occupancy')..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none"
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100 gap-3">
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
