
import React, { useState, useEffect } from 'react';
import { Calculator, Save, RefreshCw, DollarSign, Info, Download, CalendarClock, TrendingUp } from 'lucide-react';
import { MortgageCalculation } from '../types.ts';
import { api } from '../services/firestore.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { calculateRemainingBalance, generateAmortizationSchedule } from '../utils/calculations.ts';

const MortgageCalculatorPage: React.FC = () => {
  // Input State
  const [purchasePrice, setPurchasePrice] = useState<number>(2500000);
  const [downPaymentValue, setDownPaymentValue] = useState<number>(30);
  const [downPaymentMode, setDownPaymentMode] = useState<'percent' | 'amount'>('percent');
  
  const [interestRate, setInterestRate] = useState<number>(6.75);
  const [amortizationYears, setAmortizationYears] = useState<number>(25); // For monthly payment calc
  const [loanTermYears, setLoanTermYears] = useState<number>(10); // For balloon date
  
  const [annualTax, setAnnualTax] = useState<number>(35000);
  const [annualInsurance, setAnnualInsurance] = useState<number>(12000);
  const [annualHOA, setAnnualHOA] = useState<number>(0);
  
  // Stats Inputs
  const [propertyValue, setPropertyValue] = useState<number>(3000000);
  const [annualNOI, setAnnualNOI] = useState<number>(285000);
  const [monthlyIncome, setMonthlyIncome] = useState<number>(25000);

  // Computed State
  const [loanAmount, setLoanAmount] = useState<number>(0);
  const [monthlyPaymentPI, setMonthlyPaymentPI] = useState(0);
  const [totalMonthlyPayment, setTotalMonthlyPayment] = useState(0);
  const [balloonPayment, setBalloonPayment] = useState(0);
  const [totalInterest, setTotalInterest] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [savedCalculations, setSavedCalculations] = useState<MortgageCalculation[]>([]);

  const { currentUser } = useAuth();

  useEffect(() => {
    calculateMortgage();
  }, [purchasePrice, downPaymentValue, downPaymentMode, interestRate, amortizationYears, loanTermYears, annualTax, annualInsurance, annualHOA]);

  useEffect(() => {
    loadSavedCalculations();
  }, [currentUser]);

  const loadSavedCalculations = async () => {
    try {
        if (currentUser?.id) {
            const saved = await api.getCalculations(currentUser.id);
            setSavedCalculations(saved);
        }
    } catch (e) {
        console.error("Error loading calculations", e);
    }
  };

  const calculateMortgage = () => {
    let principal = 0;
    
    if (downPaymentMode === 'percent') {
        const dpAmount = purchasePrice * (downPaymentValue / 100);
        principal = purchasePrice - dpAmount;
    } else {
        principal = purchasePrice - downPaymentValue;
    }
    
    if (principal < 0) principal = 0;
    setLoanAmount(principal);

    const rate = Number(interestRate) || 0;
    
    // Monthly payment based on Amortization Period
    const r = rate / 100 / 12;
    const nAmort = (Number(amortizationYears) || 0) * 12;
    const nTerm = (Number(loanTermYears) || 0) * 12;

    let pi = 0;
    if (rate === 0) {
        pi = nAmort > 0 ? principal / nAmort : 0;
    } else {
        pi = (principal * r) / (1 - Math.pow(1 + r, -nAmort));
    }
    
    if (!isFinite(pi)) pi = 0;

    // Calculate Balloon using utility
    const balloon = calculateRemainingBalance(principal, rate, amortizationYears, nTerm);

    const taxMonthly = (Number(annualTax) || 0) / 12;
    const insMonthly = (Number(annualInsurance) || 0) / 12;
    const hoaMonthly = (Number(annualHOA) || 0) / 12;

    const totalMonthly = pi + taxMonthly + insMonthly + hoaMonthly;
    
    // Total Cost over the Term (not Amortization)
    const totalPayments = pi * nTerm;
    // Interest paid over the Term approximately
    const totalCostOverTerm = totalPayments + balloon;
    
    setMonthlyPaymentPI(pi);
    setTotalMonthlyPayment(totalMonthly);
    setBalloonPayment(balloon);
    setTotalCost(totalCostOverTerm);
  };

  const handleClear = () => {
    setPurchasePrice(0);
    setDownPaymentValue(0);
    setInterestRate(0);
    setAmortizationYears(25);
    setLoanTermYears(10);
    setAnnualTax(0);
    setAnnualInsurance(0);
    setAnnualHOA(0);
    setPropertyValue(0);
    setAnnualNOI(0);
    setMonthlyIncome(0);
  };

  const handleSave = async () => {
    if (!currentUser) {
        alert("You must be logged in to save.");
        return;
    }
    
    const calc: MortgageCalculation = {
        id: Math.random().toString(36).substr(2, 9),
        userId: currentUser.id,
        timestamp: new Date().toISOString(),
        purchasePrice,
        downPaymentValue,
        downPaymentMode,
        loanAmount,
        interestRate,
        loanTermYears: amortizationYears, // Stored as Amort
        loanTerm: loanTermYears, // Stored as Term (Balloon)
        annualTax,
        annualInsurance,
        annualHOA,
        monthlyPayment: totalMonthlyPayment,
        totalCostOfLoan: totalCost,
        balloonPayment,
        propertyValue,
        annualNOI
    };
    await api.saveCalculation(calc);
    alert("Calculation saved to history.");
    loadSavedCalculations();
  };

  const handlePrint = () => {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(16, 61, 49);
    doc.text('Summit Commercial Group', 105, 20, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Commercial Loan Analysis', 105, 30, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${today}`, 105, 38, { align: 'center' });
    
    // Loan Details
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Loan Structure', 14, 50);
    
    const loanDetails = [
      ['Purchase Price', `$${purchasePrice.toLocaleString()}`],
      ['Down Payment', downPaymentMode === 'percent' 
        ? `${downPaymentValue}% ($${(purchasePrice * downPaymentValue / 100).toLocaleString()})`
        : `$${downPaymentValue.toLocaleString()}`],
      ['Loan Amount', `$${loanAmount.toLocaleString()}`],
      ['Interest Rate', `${interestRate}%`],
      ['Amortization', `${amortizationYears} Years`],
      ['Loan Term (Balloon)', `${loanTermYears} Years`],
    ];
    
    autoTable(doc, {
        startY: 55,
        head: [['Item', 'Value']],
        body: loanDetails,
        theme: 'striped',
        headStyles: { fillColor: [16, 61, 49] }
    });
    
    // Monthly Payment Breakdown
    const finalY = (doc as any).lastAutoTable?.finalY || 100;
    doc.text('Monthly Payment Breakdown', 14, finalY + 10);
    
    const monthlyBreakdown = [
      ['Principal & Interest', `$${monthlyPaymentPI.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`],
      ['Property Tax', `$${(annualTax / 12).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`],
      ['Insurance', `$${(annualInsurance / 12).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`],
      ['HOA Fees', `$${(annualHOA / 12).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`],
      ['Total Monthly Payment', `$${totalMonthlyPayment.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`],
    ];
    
    autoTable(doc, {
        startY: finalY + 15,
        head: [['Component', 'Amount']],
        body: monthlyBreakdown,
        theme: 'striped',
        headStyles: { fillColor: [16, 61, 49] },
        footStyles: { fillColor: [16, 61, 49], fontStyle: 'bold' }
    });

    // Balloon & Metrics
    const finalY2 = (doc as any).lastAutoTable?.finalY || 150;
    doc.text('Key Metrics & Balloon', 14, finalY2 + 10);

    const ltv = propertyValue > 0 ? (loanAmount / propertyValue) * 100 : 0;
    const annualDebtService = monthlyPaymentPI * 12;
    const dscr = annualDebtService > 0 ? annualNOI / annualDebtService : 0;

    const metrics = [
        ['Balloon Payment (End of Term)', `$${balloonPayment.toLocaleString(undefined, {minimumFractionDigits: 2})}`],
        ['LTV Ratio', `${ltv.toFixed(2)}%`],
        ['DSCR', dscr.toFixed(2)],
        ['Annual NOI', `$${annualNOI.toLocaleString()}`]
    ];

    autoTable(doc, {
        startY: finalY2 + 15,
        head: [['Metric', 'Value']],
        body: metrics,
        theme: 'grid',
        headStyles: { fillColor: [16, 61, 49] }
    });
    
    doc.save(`Commercial_Loan_Analysis_${today.replace(/\//g, '-')}.pdf`);
  };

  const renderAmortization = () => {
    const schedule = generateAmortizationSchedule(loanAmount, interestRate, amortizationYears, loanTermYears);
    
    return schedule.slice(0, 12).map((row) => (
        <tr key={row.paymentNumber} className="hover:bg-slate-50 text-sm">
            <td className="p-3 border-b border-slate-100">{row.paymentNumber}</td>
            <td className="p-3 border-b border-slate-100">{row.date.toLocaleDateString()}</td>
            <td className="p-3 border-b border-slate-100 text-right font-medium">${row.payment.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td className="p-3 border-b border-slate-100 text-right text-green-700">${row.principal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td className="p-3 border-b border-slate-100 text-right text-red-700">${row.interest.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td className="p-3 border-b border-slate-100 text-right font-bold">${row.balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
        </tr>
    ));
  };

  const ltv = propertyValue > 0 ? (loanAmount / propertyValue) * 100 : 0;
  const annualDebtService = monthlyPaymentPI * 12;
  const dscr = annualDebtService > 0 ? annualNOI / annualDebtService : 0;
  const breakEven = (monthlyIncome - totalMonthlyPayment) >= 0 ? "Cash Flow Positive" : `$${Math.abs(monthlyIncome - totalMonthlyPayment).toFixed(0)} Shortfall`;

  return (
    <div className="max-w-6xl mx-auto pb-10 print:w-full print:max-w-none print:pb-0">
      <div className="bg-summit-900 text-white p-6 rounded-t-xl shadow-lg print:shadow-none print:rounded-none flex justify-between items-center mb-6 print:mb-8 print:border-b-2 print:border-slate-800">
         <div>
            <h1 className="text-2xl font-bold uppercase tracking-wide">Commercial Loan Calculator</h1>
            <p className="text-slate-300 text-sm opacity-80 print:text-slate-100">Amortization & Balloon Payment Analysis</p>
         </div>
         <div className="flex gap-3 print:hidden">
            <button onClick={handleClear} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                <RefreshCw size={16} /> Clear
            </button>
            <button onClick={handleSave} className="bg-summit-accent text-summit-900 hover:bg-emerald-400 px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors">
                <Save size={16} /> Save
            </button>
            <button onClick={handlePrint} className="bg-white text-summit-900 hover:bg-slate-100 px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors">
                <Download size={16} /> PDF Report
            </button>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:grid-cols-2 print:gap-8">
         <div className="space-y-8 print:space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:border print:border-slate-300 print:break-inside-avoid print:shadow-none">
               <div className="bg-blue-50 p-4 border-b border-blue-100 print:bg-slate-100 print:border-slate-300">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                     <Calculator size={20} className="text-summit-900" /> Loan Parameters
                  </h2>
               </div>
               <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                     <label className="font-bold text-slate-700">Purchase Price:</label>
                     <div className="relative print:hidden">
                        <DollarSign size={16} className="absolute left-3 top-3 text-slate-400" />
                        <input 
                          type="number" 
                          value={purchasePrice}
                          onChange={(e) => setPurchasePrice(Number(e.target.value))}
                          className="w-full pl-9 pr-4 py-2 bg-amber-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-summit-accent outline-none font-bold text-slate-900" 
                        />
                     </div>
                     <div className="hidden print:block text-right font-bold text-slate-900">${purchasePrice.toLocaleString()}</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                     <label className="font-bold text-slate-700">Down Payment:</label>
                     <div className="flex gap-2 print:hidden">
                        <input 
                           type="number" 
                           value={downPaymentValue}
                           onChange={(e) => setDownPaymentValue(Number(e.target.value))}
                           className="w-full px-4 py-2 bg-amber-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-summit-accent outline-none font-bold text-slate-900" 
                        />
                        <div className="flex rounded-lg border border-slate-300 overflow-hidden shrink-0">
                           <button onClick={() => setDownPaymentMode('percent')} className={`px-3 py-1 text-xs font-bold ${downPaymentMode === 'percent' ? 'bg-summit-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>%</button>
                           <button onClick={() => setDownPaymentMode('amount')} className={`px-3 py-1 text-xs font-bold ${downPaymentMode === 'amount' ? 'bg-summit-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>$</button>
                        </div>
                     </div>
                     <div className="hidden print:block text-right font-bold text-slate-900">
                        {downPaymentMode === 'percent' ? `${downPaymentValue}%` : `$${downPaymentValue.toLocaleString()}`}
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center pt-2 border-t border-slate-100">
                     <label className="text-slate-500 font-medium">Financed Amount:</label>
                     <div className="text-right text-lg font-bold text-blue-600 print:text-slate-900">${loanAmount.toLocaleString()}</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                     <label className="font-bold text-slate-700">Interest Rate (%):</label>
                     <input type="number" step="0.125" value={interestRate} onChange={(e) => setInterestRate(Number(e.target.value))} className="w-full px-4 py-2 bg-amber-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-summit-accent outline-none font-bold text-slate-900 text-right print:hidden" />
                     <div className="hidden print:block text-right font-bold text-slate-900">{interestRate}%</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                     <label className="font-bold text-slate-700 flex items-center gap-1">
                        Amortization <span className="text-xs font-normal text-slate-400">(Yrs)</span>
                     </label>
                     <input type="number" value={amortizationYears} onChange={(e) => setAmortizationYears(Number(e.target.value))} className="w-full px-4 py-2 bg-amber-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-summit-accent outline-none font-bold text-slate-900 text-right print:hidden" />
                     <div className="hidden print:block text-right font-bold text-slate-900">{amortizationYears} Years</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                     <label className="font-bold text-slate-700 flex items-center gap-1">
                        Loan Term <span className="text-xs font-normal text-slate-400">(Balloon Yrs)</span>
                     </label>
                     <input type="number" value={loanTermYears} onChange={(e) => setLoanTermYears(Number(e.target.value))} className="w-full px-4 py-2 bg-amber-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-summit-accent outline-none font-bold text-slate-900 text-right print:hidden" />
                     <div className="hidden print:block text-right font-bold text-slate-900">{loanTermYears} Years</div>
                  </div>
               </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:border print:border-slate-300 print:break-inside-avoid print:shadow-none">
               <div className="bg-blue-50 p-4 border-b border-blue-100 print:bg-slate-100 print:border-slate-300">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                     <Info size={20} className="text-summit-900" /> Additional Costs
                  </h2>
               </div>
               <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                     <label className="font-bold text-slate-700">Annual Property Tax:</label>
                     <div className="relative print:hidden">
                        <DollarSign size={16} className="absolute left-3 top-3 text-slate-400" />
                        <input type="number" value={annualTax} onChange={(e) => setAnnualTax(Number(e.target.value))} className="w-full pl-9 pr-4 py-2 bg-amber-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-summit-accent outline-none font-bold text-slate-900" />
                     </div>
                     <div className="hidden print:block text-right font-bold text-slate-900">${annualTax.toLocaleString()}</div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                     <label className="font-bold text-slate-700">Annual Insurance:</label>
                     <div className="relative print:hidden">
                        <DollarSign size={16} className="absolute left-3 top-3 text-slate-400" />
                        <input type="number" value={annualInsurance} onChange={(e) => setAnnualInsurance(Number(e.target.value))} className="w-full pl-9 pr-4 py-2 bg-amber-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-summit-accent outline-none font-bold text-slate-900" />
                     </div>
                     <div className="hidden print:block text-right font-bold text-slate-900">${annualInsurance.toLocaleString()}</div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                     <label className="font-bold text-slate-700">Annual HOA Fees:</label>
                     <div className="relative print:hidden">
                        <DollarSign size={16} className="absolute left-3 top-3 text-slate-400" />
                        <input type="number" value={annualHOA} onChange={(e) => setAnnualHOA(Number(e.target.value))} className="w-full pl-9 pr-4 py-2 bg-amber-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-summit-accent outline-none font-bold text-slate-900" />
                     </div>
                     <div className="hidden print:block text-right font-bold text-slate-900">${annualHOA.toLocaleString()}</div>
                  </div>
               </div>
            </div>
         </div>

         <div className="space-y-8 print:space-y-6">
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden print:border print:border-slate-300 print:break-inside-avoid print:shadow-none">
               <div className="bg-green-100 p-4 border-b border-green-200 print:bg-green-50 print:border-green-100">
                  <h2 className="font-bold text-green-900 flex items-center gap-2 text-lg">
                     Payment Breakdown
                  </h2>
               </div>
               <div className="p-6 space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                     <span className="font-bold text-slate-700">Monthly P&I ({amortizationYears}yr Amort):</span>
                     <span className="font-mono text-lg">${monthlyPaymentPI.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                     <span className="font-bold text-slate-700">Monthly Tax/Ins/HOA:</span>
                     <span className="font-mono text-lg">${((annualTax + annualInsurance + annualHOA) / 12).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                  
                  <div className="bg-yellow-200 p-4 rounded-lg mt-4 flex justify-between items-center border border-yellow-300 print:bg-yellow-100 print:border-yellow-200">
                     <span className="font-bold text-xl text-yellow-900">TOTAL MONTHLY:</span>
                     <span className="font-bold text-2xl text-yellow-900">${totalMonthlyPayment.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
               </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border-2 border-slate-800 overflow-hidden print:border-slate-800 print:break-inside-avoid print:shadow-none">
               <div className="bg-slate-900 p-4 border-b border-slate-700">
                  <h2 className="font-bold text-white flex items-center gap-2 text-lg">
                     <CalendarClock size={20} className="text-summit-accent" /> Balloon Payment
                  </h2>
               </div>
               <div className="p-6 text-center">
                  <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mb-2">Due at End of Year {loanTermYears}</p>
                  <p className="text-4xl font-black text-slate-900 tracking-tight">${balloonPayment.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                  <p className="text-sm text-red-600 font-medium mt-3 bg-red-50 inline-block px-3 py-1 rounded-full">Refinance or Payoff Required</p>
               </div>
            </div>

             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:border print:border-slate-300 print:break-inside-avoid print:shadow-none">
               <div className="bg-blue-50 p-4 border-b border-blue-100 print:bg-slate-100 print:border-slate-300">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                     <TrendingUp size={20} className="text-summit-900" /> Investment Metrics
                  </h2>
               </div>
               <div className="p-6 grid grid-cols-2 gap-6">
                  <div className={`p-4 rounded-lg border ${ltv > 80 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                      <p className="text-xs font-bold uppercase text-slate-500">Loan-to-Value (LTV)</p>
                      <p className={`text-2xl font-bold ${ltv > 80 ? 'text-red-700' : 'text-green-700'}`}>{ltv.toFixed(2)}%</p>
                  </div>
                  <div className={`p-4 rounded-lg border ${dscr < 1.25 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                      <p className="text-xs font-bold uppercase text-slate-500">DSCR</p>
                      <p className={`text-2xl font-bold ${dscr < 1.25 ? 'text-red-700' : 'text-green-700'}`}>{dscr.toFixed(2)}</p>
                  </div>
                  <div className="col-span-2">
                     <label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Annual NOI</label>
                     <input type="number" value={annualNOI} onChange={e => setAnnualNOI(Number(e.target.value))} className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-bold" />
                  </div>
               </div>
            </div>
         </div>
      </div>

      <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:border print:border-slate-300 print:break-inside-avoid print:shadow-none print:mt-6">
         <div className="bg-blue-50 p-4 border-b border-blue-100 print:bg-slate-100 print:border-slate-300">
             <h2 className="font-bold text-slate-800 text-lg">First Year Amortization Schedule</h2>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead className="bg-slate-50 text-slate-600 uppercase text-xs font-bold print:bg-slate-100">
                  <tr>
                     <th className="p-3 border-b border-slate-200">#</th>
                     <th className="p-3 border-b border-slate-200">Date</th>
                     <th className="p-3 border-b border-slate-200 text-right">Payment</th>
                     <th className="p-3 border-b border-slate-200 text-right">Principal</th>
                     <th className="p-3 border-b border-slate-200 text-right">Interest</th>
                     <th className="p-3 border-b border-slate-200 text-right">End Bal</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {renderAmortization()}
               </tbody>
            </table>
         </div>
      </div>

      {savedCalculations.length > 0 && (
          <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:hidden">
              <div className="bg-slate-50 p-4 border-b border-slate-200">
                  <h2 className="font-bold text-slate-800 text-lg">Saved Calculations</h2>
              </div>
              <div className="p-4 overflow-x-auto">
                  <table className="w-full text-sm text-left">
                      <thead className="text-slate-500 uppercase font-bold text-xs bg-slate-50">
                          <tr>
                              <th className="p-2">Date</th>
                              <th className="p-2">Purchase Price</th>
                              <th className="p-2">Loan Amt</th>
                              <th className="p-2">Amort / Term</th>
                              <th className="p-2">Payment</th>
                              <th className="p-2">Action</th>
                          </tr>
                      </thead>
                      <tbody>
                          {savedCalculations.map(c => (
                              <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                                  <td className="p-2">{new Date(c.timestamp).toLocaleDateString()}</td>
                                  <td className="p-2 font-mono">${(c.purchasePrice || 0).toLocaleString()}</td>
                                  <td className="p-2 font-mono">${c.loanAmount.toLocaleString()}</td>
                                  <td className="p-2">{c.loanTermYears}yr / {c.loanTerm || c.loanTermYears}yr</td>
                                  <td className="p-2 font-mono font-bold">${c.monthlyPayment.toLocaleString()}</td>
                                  <td className="p-2">
                                      <button 
                                        onClick={() => {
                                            setPurchasePrice(c.purchasePrice || 0);
                                            setDownPaymentValue(c.downPaymentValue || 0);
                                            setInterestRate(c.interestRate);
                                            setAmortizationYears(c.loanTermYears);
                                            setLoanTermYears(c.loanTerm || c.loanTermYears);
                                            setAnnualTax(c.annualTax);
                                            setAnnualInsurance(c.annualInsurance);
                                            setAnnualHOA(c.annualHOA);
                                            if(c.propertyValue) setPropertyValue(c.propertyValue);
                                            if(c.annualNOI) setAnnualNOI(c.annualNOI);
                                        }}
                                        className="text-summit-accent hover:text-emerald-700 font-bold text-xs"
                                      >
                                          Load
                                      </button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

    </div>
  );
};

export default MortgageCalculatorPage;
