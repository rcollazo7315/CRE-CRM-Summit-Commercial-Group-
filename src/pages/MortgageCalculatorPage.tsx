import React, { useState, useEffect } from 'react';
import { Calculator, Save, RefreshCw, DollarSign, Info, Download } from 'lucide-react';
import { MortgageCalculation } from '../types.ts';
import { api } from '../services/firestore.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const MortgageCalculatorPage: React.FC = () => {
  // Input State
  const [purchasePrice, setPurchasePrice] = useState<number>(2500000);
  const [downPaymentValue, setDownPaymentValue] = useState<number>(20);
  const [downPaymentMode, setDownPaymentMode] = useState<'percent' | 'amount'>('percent');
  
  const [interestRate, setInterestRate] = useState<number>(6.5);
  const [loanTermYears, setLoanTermYears] = useState<number>(25);
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
  const [totalInterest, setTotalInterest] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [savedCalculations, setSavedCalculations] = useState<MortgageCalculation[]>([]);

  const { currentUser } = useAuth();

  useEffect(() => {
    calculateMortgage();
  }, [purchasePrice, downPaymentValue, downPaymentMode, interestRate, loanTermYears, annualTax, annualInsurance, annualHOA]);

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
    const years = Number(loanTermYears) || 0;

    const r = rate / 100 / 12;
    const n = years * 12;

    let pi = 0;
    if (rate === 0) {
        pi = n > 0 ? principal / n : 0;
    } else {
        pi = (principal * r) / (1 - Math.pow(1 + r, -n));
    }
    
    if (!isFinite(pi)) pi = 0;

    const taxMonthly = (Number(annualTax) || 0) / 12;
    const insMonthly = (Number(annualInsurance) || 0) / 12;
    const hoaMonthly = (Number(annualHOA) || 0) / 12;

    const totalMonthly = pi + taxMonthly + insMonthly + hoaMonthly;
    
    const totalPayments = pi * n;
    const totalInt = totalPayments - principal;
    const totalTx = (Number(annualTax) || 0) * years;
    const totalIns = (Number(annualInsurance) || 0) * years;
    const totalH = (Number(annualHOA) || 0) * years;
    const totalC = totalPayments + totalTx + totalIns + totalH;

    setMonthlyPaymentPI(pi);
    setTotalMonthlyPayment(totalMonthly);
    setTotalInterest(totalInt);
    setTotalCost(totalC);
  };

  const handleClear = () => {
    setPurchasePrice(0);
    setDownPaymentValue(0);
    setInterestRate(0);
    setLoanTermYears(0);
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
        loanTermYears,
        loanTerm: loanTermYears,
        annualTax,
        annualInsurance,
        annualHOA,
        monthlyPayment: totalMonthlyPayment,
        totalCostOfLoan: totalCost,
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
    doc.text('Mortgage Analysis Report', 105, 30, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${today}`, 105, 38, { align: 'center' });
    
    // Property Details
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Loan Details', 14, 50);
    
    const loanDetails = [
      ['Purchase Price', `$${purchasePrice.toLocaleString()}`],
      ['Down Payment', downPaymentMode === 'percent' 
        ? `${downPaymentValue}% ($${(purchasePrice * downPaymentValue / 100).toLocaleString()})`
        : `$${downPaymentValue.toLocaleString()}`],
      ['Loan Amount', `$${loanAmount.toLocaleString()}`],
      ['Interest Rate', `${interestRate}%`],
      ['Loan Term', `${loanTermYears} years`],
    ];
    
    if ((doc as any).autoTable) {
        (doc as any).autoTable({
            startY: 55,
            head: [['Item', 'Value']],
            body: loanDetails,
            theme: 'striped',
            headStyles: { fillColor: [16, 61, 49] }
        });
    }
    
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
    
    if ((doc as any).autoTable) {
        (doc as any).autoTable({
            startY: finalY + 15,
            head: [['Component', 'Amount']],
            body: monthlyBreakdown,
            theme: 'striped',
            headStyles: { fillColor: [16, 61, 49] },
            footStyles: { fillColor: [16, 61, 49], fontStyle: 'bold' }
        });
    }
    
    // Investment Metrics
    const finalY2 = (doc as any).lastAutoTable?.finalY || 150;
    doc.text('Investment Metrics', 14, finalY2 + 10);
    
    const ltv = propertyValue > 0 ? (loanAmount / propertyValue) * 100 : 0;
    const annualDebtService = monthlyPaymentPI * 12;
    const dscr = annualDebtService > 0 ? annualNOI / annualDebtService : 0;
    
    const metrics = [
      ['Property Value', `$${propertyValue.toLocaleString()}`],
      ['Annual NOI', `$${annualNOI.toLocaleString()}`],
      ['LTV Ratio', `${ltv.toFixed(2)}%`],
      ['DSCR', dscr.toFixed(2)],
      ['Cap Rate', propertyValue > 0 ? `${((annualNOI / propertyValue) * 100).toFixed(2)}%` : 'N/A'],
    ];
    
    if ((doc as any).autoTable) {
        (doc as any).autoTable({
            startY: finalY2 + 15,
            head: [['Metric', 'Value']],
            body: metrics,
            theme: 'striped',
            headStyles: { fillColor: [16, 61, 49] }
        });
    }
    
    // Amortization Schedule (First 12 Months)
    const finalY3 = (doc as any).lastAutoTable?.finalY || 200;
    
    if (finalY3 < 250) { 
      doc.text('Amortization Schedule (First Year)', 14, finalY3 + 10);
      
      const r = (interestRate || 0) / 100 / 12;
      let balance = loanAmount;
      const payment = monthlyPaymentPI;
      const amortRows = [];
      
      for (let i = 1; i <= 12; i++) {
        const interest = balance * r;
        const principal = payment - interest;
        balance = balance - principal;
        
        amortRows.push([
          i.toString(),
          `$${payment.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
          `$${principal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
          `$${interest.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
          `$${balance > 0 ? balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '0.00'}`
        ]);
      }
      
      if ((doc as any).autoTable) {
        (doc as any).autoTable({
            startY: finalY3 + 15,
            head: [['Month', 'Payment', 'Principal', 'Interest', 'Balance']],
            body: amortRows,
            theme: 'striped',
            headStyles: { fillColor: [16, 61, 49] },
            styles: { fontSize: 8 }
        });
      }
    }
    
    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${i} of ${pageCount} | Summit CRM © ${new Date().getFullYear()}`,
        105,
        285,
        { align: 'center' }
      );
    }
    
    doc.save(`Mortgage_Analysis_${today.replace(/\//g, '-')}.pdf`);
  };

  const renderAmortization = () => {
    const r = (Number(interestRate) || 0) / 100 / 12;
    let balance = loanAmount;
    const payment = monthlyPaymentPI;
    const rows = [];
    const today = new Date();

    for (let i = 1; i <= 12; i++) {
        const interest = balance * r;
        const principal = payment - interest;
        balance = balance - principal;
        const date = new Date(today.getFullYear(), today.getMonth() + i, 1);

        rows.push(
            <tr key={i} className="hover:bg-slate-50 text-sm">
                <td className="p-3 border-b border-slate-100">{i}</td>
                <td className="p-3 border-b border-slate-100">{date.toLocaleDateString()}</td>
                <td className="p-3 border-b border-slate-100 text-right">${(balance + principal).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td className="p-3 border-b border-slate-100 text-right font-medium">${payment.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td className="p-3 border-b border-slate-100 text-right text-green-700">${principal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td className="p-3 border-b border-slate-100 text-right text-red-700">${interest.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td className="p-3 border-b border-slate-100 text-right font-bold">${balance > 0 ? balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '0.00'}</td>
            </tr>
        );
    }
    return rows;
  };

  const ltv = propertyValue > 0 ? (loanAmount / propertyValue) * 100 : 0;
  const annualDebtService = monthlyPaymentPI * 12;
  const dscr = annualDebtService > 0 ? annualNOI / annualDebtService : 0;
  const breakEven = (monthlyIncome - totalMonthlyPayment) >= 0 ? "Cash Flow Positive" : `$${Math.abs(monthlyIncome - totalMonthlyPayment).toFixed(0)} Shortfall`;

  return (
    <div className="max-w-6xl mx-auto pb-10 print:w-full print:max-w-none print:pb-0">
      <div className="bg-summit-900 text-white p-6 rounded-t-xl shadow-lg print:shadow-none print:rounded-none flex justify-between items-center mb-6 print:mb-8 print:border-b-2 print:border-slate-800">
         <div>
            <h1 className="text-2xl font-bold uppercase tracking-wide">Commercial Mortgage Calculator</h1>
            <p className="text-slate-300 text-sm opacity-80 print:text-slate-100">Summit Commercial Group | Financial Analysis Tool</p>
         </div>
         <div className="flex gap-3 print:hidden">
            <button onClick={handleClear} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                <RefreshCw size={16} /> Clear
            </button>
            <button onClick={handleSave} className="bg-summit-accent text-summit-900 hover:bg-emerald-400 px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors">
                <Save size={16} /> Save
            </button>
            <button onClick={handlePrint} className="bg-white text-summit-900 hover:bg-slate-100 px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors">
                <Download size={16} /> Download PDF Report
            </button>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:grid-cols-2 print:gap-8">
         <div className="space-y-8 print:space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:border print:border-slate-300 print:break-inside-avoid print:shadow-none">
               <div className="bg-blue-50 p-4 border-b border-blue-100 print:bg-slate-100 print:border-slate-300">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                     <Calculator size={20} className="text-summit-900" /> Loan Inputs
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
                     <input type="number" value={interestRate} onChange={(e) => setInterestRate(Number(e.target.value))} className="w-full px-4 py-2 bg-amber-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-summit-accent outline-none font-bold text-slate-900 text-right print:hidden" />
                     <div className="hidden print:block text-right font-bold text-slate-900">{interestRate}%</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                     <label className="font-bold text-slate-700">Loan Term (Years):</label>
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

             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:border print:border-slate-300 print:break-inside-avoid print:shadow-none">
               <div className="bg-blue-50 p-4 border-b border-blue-100 print:bg-slate-100 print:border-slate-300">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                     <Info size={20} className="text-summit-900" /> Analysis Inputs
                  </h2>
               </div>
               <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                     <label className="font-bold text-slate-700">Property Value (Appraised):</label>
                     <input type="number" value={propertyValue} onChange={e => setPropertyValue(Number(e.target.value))} className="w-full p-2 bg-amber-50 border border-slate-300 rounded font-bold print:hidden" />
                     <div className="hidden print:block text-right font-bold text-slate-900">${propertyValue.toLocaleString()}</div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                     <label className="font-bold text-slate-700">Annual NOI:</label>
                     <input type="number" value={annualNOI} onChange={e => setAnnualNOI(Number(e.target.value))} className="w-full p-2 bg-amber-50 border border-slate-300 rounded font-bold print:hidden" />
                     <div className="hidden print:block text-right font-bold text-slate-900">${annualNOI.toLocaleString()}</div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                     <label className="font-bold text-slate-700">Monthly Gross Income:</label>
                     <input type="number" value={monthlyIncome} onChange={e => setMonthlyIncome(Number(e.target.value))} className="w-full p-2 bg-amber-50 border border-slate-300 rounded font-bold print:hidden" />
                     <div className="hidden print:block text-right font-bold text-slate-900">${monthlyIncome.toLocaleString()}</div>
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
                     <span className="font-bold text-slate-700">Monthly Principal & Interest:</span>
                     <span className="font-mono text-lg">${monthlyPaymentPI.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                     <span className="font-bold text-slate-700">Monthly Property Tax:</span>
                     <span className="font-mono text-lg">${(annualTax/12).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                     <span className="font-bold text-slate-700">Monthly Insurance:</span>
                     <span className="font-mono text-lg">${(annualInsurance/12).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                     <span className="font-bold text-slate-700">Monthly HOA:</span>
                     <span className="font-mono text-lg">${(annualHOA/12).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                  
                  <div className="bg-yellow-200 p-4 rounded-lg mt-4 flex justify-between items-center border border-yellow-300 print:bg-yellow-100 print:border-yellow-200">
                     <span className="font-bold text-xl text-yellow-900">TOTAL MONTHLY:</span>
                     <span className="font-bold text-2xl text-yellow-900">${totalMonthlyPayment.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
               </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:border print:border-slate-300 print:break-inside-avoid print:shadow-none">
               <div className="bg-blue-50 p-4 border-b border-blue-100 print:bg-slate-100 print:border-slate-300">
                  <h2 className="font-bold text-slate-800 text-lg">Life of Loan Breakdown</h2>
               </div>
               <div className="p-6 space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                     <span className="font-bold text-slate-700">Total Interest Paid:</span>
                     <span className="font-mono text-lg">${totalInterest.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                     <span className="font-bold text-slate-700">Total Tax & Insurance:</span>
                     <span className="font-mono text-lg">${((annualTax + annualInsurance + annualHOA) * loanTermYears).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg mt-4 flex justify-between items-center border border-red-100 print:bg-red-50 print:border-red-100">
                     <span className="font-bold text-xl text-red-900">TOTAL COST OF LOAN:</span>
                     <span className="font-bold text-2xl text-red-900">${totalCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
               </div>
            </div>

             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:border print:border-slate-300 print:break-inside-avoid print:shadow-none">
               <div className="bg-blue-50 p-4 border-b border-blue-100 print:bg-slate-100 print:border-slate-300">
                  <h2 className="font-bold text-slate-800 text-lg">Loan Metrics</h2>
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
                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 col-span-2 print:border-slate-300">
                      <p className="text-xs font-bold uppercase text-slate-500">Break-even Analysis</p>
                      <p className="text-xl font-bold text-slate-700">{breakEven}</p>
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
                     <th className="p-3 border-b border-slate-200 text-right">Start Bal</th>
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
                              <th className="p-2">Rate</th>
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
                                  <td className="p-2">{c.interestRate}%</td>
                                  <td className="p-2 font-mono font-bold">${c.monthlyPayment.toLocaleString()}</td>
                                  <td className="p-2">
                                      <button 
                                        onClick={() => {
                                            setPurchasePrice(c.purchasePrice || 0);
                                            setDownPaymentValue(c.downPaymentValue || 0);
                                            setInterestRate(c.interestRate);
                                            setLoanTermYears(c.loanTermYears);
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