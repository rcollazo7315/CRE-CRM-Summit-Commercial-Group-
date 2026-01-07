
import React, { useState, useEffect } from 'react';
import { Calculator, Save, RefreshCw, DollarSign, Info, Download, CalendarClock, TrendingUp } from 'lucide-react';
import { MortgageCalculation, MortgageCalculationResults } from '../types.ts';
import { api } from '../services/firestore.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { calculateMortgageResults } from '../utils/calculations.ts';
import { generateMortgageReport } from '../utils/pdfGenerator.ts';

const MortgageCalculatorPage: React.FC = () => {
  const { currentUser } = useAuth();
  
  // Input State
  const [purchasePrice, setPurchasePrice] = useState<number>(2500000);
  const [downPaymentValue, setDownPaymentValue] = useState<number>(30);
  const [downPaymentMode, setDownPaymentMode] = useState<'percent' | 'amount'>('percent');
  const [interestRate, setInterestRate] = useState<number>(6.75);
  const [amortizationYears, setAmortizationYears] = useState<number>(25); // Amortization Period
  const [loanTermYears, setLoanTermYears] = useState<number>(10); // Balloon Term
  const [annualTax, setAnnualTax] = useState<number>(35000);
  const [annualInsurance, setAnnualInsurance] = useState<number>(12000);
  const [annualHOA, setAnnualHOA] = useState<number>(0);
  
  // Stats Inputs
  const [propertyValue, setPropertyValue] = useState<number>(3000000);
  const [annualNOI, setAnnualNOI] = useState<number>(285000);
  const [monthlyIncome, setMonthlyIncome] = useState<number>(25000);

  // Results State
  const [results, setResults] = useState<MortgageCalculationResults | null>(null);
  const [loanAmount, setLoanAmount] = useState<number>(0);
  const [savedCalculations, setSavedCalculations] = useState<MortgageCalculation[]>([]);
  const [showFullSchedule, setShowFullSchedule] = useState(false);

  useEffect(() => {
    runCalculation();
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

  const runCalculation = () => {
    let principal = 0;
    if (downPaymentMode === 'percent') {
        const dpAmount = purchasePrice * (downPaymentValue / 100);
        principal = purchasePrice - dpAmount;
    } else {
        principal = purchasePrice - downPaymentValue;
    }
    
    if (principal < 0) principal = 0;
    setLoanAmount(principal);

    const calcData: MortgageCalculation = {
        id: 'temp',
        userId: currentUser?.id || '',
        timestamp: new Date().toISOString(),
        purchasePrice,
        downPaymentValue,
        downPaymentMode,
        loanAmount: principal,
        interestRate,
        loanTermYears: amortizationYears, // Amortization
        loanTerm: loanTermYears, // Balloon Term
        annualTax,
        annualInsurance,
        annualHOA,
        monthlyPayment: 0, // Placeholder
        totalCostOfLoan: 0, // Placeholder
        propertyValue,
        annualNOI
    };

    const res = calculateMortgageResults(calcData);
    setResults(res);
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
    if (!currentUser || !results) {
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
        loanTermYears: amortizationYears,
        loanTerm: loanTermYears,
        annualTax,
        annualInsurance,
        annualHOA,
        monthlyPayment: results.monthlyPayment,
        totalCostOfLoan: results.totalInterest + loanAmount,
        balloonPayment: results.balloonPayment,
        propertyValue,
        annualNOI,
        calculatedResults: results
    };
    await api.saveCalculation(calc);
    alert("Calculation saved to history.");
    loadSavedCalculations();
  };

  const handlePrint = async () => {
    if (!results) return;
    
    const calcData: MortgageCalculation = {
        id: 'temp',
        userId: currentUser?.id || '',
        timestamp: new Date().toISOString(),
        purchasePrice,
        downPaymentValue,
        downPaymentMode,
        loanAmount,
        interestRate,
        loanTermYears: amortizationYears,
        loanTerm: loanTermYears,
        annualTax,
        annualInsurance,
        annualHOA,
        monthlyPayment: results.monthlyPayment,
        totalCostOfLoan: 0,
        propertyValue,
        annualNOI,
        calculatedResults: results
    };

    const pdf = await generateMortgageReport(calcData, currentUser);
    pdf.save(`Mortgage_Analysis_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Metrics
  const ltv = propertyValue > 0 && results ? (loanAmount / propertyValue) * 100 : 0;
  const annualDebtService = results ? results.monthlyPayment * 12 : 0;
  const dscr = annualDebtService > 0 ? annualNOI / annualDebtService : 0;
  const totalMonthlyCost = results ? results.monthlyPayment + ((annualTax+annualInsurance+annualHOA)/12) : 0;
  const breakEven = (monthlyIncome - totalMonthlyCost) >= 0 ? "Cash Flow Positive" : `$${Math.abs(monthlyIncome - totalMonthlyCost).toFixed(0)} Shortfall`;

  return (
    <div className="max-w-6xl mx-auto pb-10 print:w-full print:max-w-none print:pb-0">
      <div className="bg-summit-900 text-white p-6 rounded-t-xl shadow-lg flex justify-between items-center mb-6">
         <div>
            <h1 className="text-2xl font-bold uppercase tracking-wide">Commercial Loan Calculator</h1>
            <p className="text-slate-300 text-sm opacity-80">Amortization & Balloon Payment Analysis</p>
         </div>
         <div className="flex gap-3">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="space-y-8">
            {/* INPUTS */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="bg-blue-50 p-4 border-b border-blue-100">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                     <Calculator size={20} className="text-summit-900" /> Loan Parameters
                  </h2>
               </div>
               <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                     <label className="font-bold text-slate-700">Purchase Price:</label>
                     <div className="relative">
                        <DollarSign size={16} className="absolute left-3 top-3 text-slate-400" />
                        <input type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(Number(e.target.value))} className="w-full pl-9 pr-4 py-2 bg-amber-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-summit-accent outline-none font-bold text-slate-900" />
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                     <label className="font-bold text-slate-700">Down Payment:</label>
                     <div className="flex gap-2">
                        <input type="number" value={downPaymentValue} onChange={(e) => setDownPaymentValue(Number(e.target.value))} className="w-full px-4 py-2 bg-amber-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-summit-accent outline-none font-bold text-slate-900" />
                        <div className="flex rounded-lg border border-slate-300 overflow-hidden shrink-0">
                           <button onClick={() => setDownPaymentMode('percent')} className={`px-3 py-1 text-xs font-bold ${downPaymentMode === 'percent' ? 'bg-summit-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>%</button>
                           <button onClick={() => setDownPaymentMode('amount')} className={`px-3 py-1 text-xs font-bold ${downPaymentMode === 'amount' ? 'bg-summit-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>$</button>
                        </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center pt-2 border-t border-slate-100">
                     <label className="text-slate-500 font-medium">Financed Amount:</label>
                     <div className="text-right text-lg font-bold text-blue-600">${loanAmount.toLocaleString()}</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                     <label className="font-bold text-slate-700">Interest Rate (%):</label>
                     <input type="number" step="0.125" value={interestRate} onChange={(e) => setInterestRate(Number(e.target.value))} className="w-full px-4 py-2 bg-amber-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-summit-accent outline-none font-bold text-slate-900 text-right" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                     <label className="font-bold text-slate-700 flex flex-col">
                        <span>Amortization</span>
                        <span className="text-xs font-normal text-slate-400 font-normal">Calculates Monthly P&I</span>
                     </label>
                     <div className="flex items-center gap-2">
                        <input type="number" value={amortizationYears} onChange={(e) => setAmortizationYears(Number(e.target.value))} className="w-full px-4 py-2 bg-amber-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-summit-accent outline-none font-bold text-slate-900 text-right" />
                        <span className="text-xs font-bold text-slate-500">Yrs</span>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                     <label className="font-bold text-slate-700 flex flex-col">
                        <span>Loan Term</span>
                        <span className="text-xs font-normal text-slate-400 font-normal">When Balloon is Due</span>
                     </label>
                     <div className="flex items-center gap-2">
                        <input type="number" value={loanTermYears} onChange={(e) => setLoanTermYears(Number(e.target.value))} className="w-full px-4 py-2 bg-amber-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-summit-accent outline-none font-bold text-slate-900 text-right" />
                        <span className="text-xs font-bold text-slate-500">Yrs</span>
                     </div>
                  </div>
               </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="bg-blue-50 p-4 border-b border-blue-100">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                     <Info size={20} className="text-summit-900" /> Operating Expenses (Annual)
                  </h2>
               </div>
               <div className="p-6 space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Property Tax</label>
                        <input type="number" value={annualTax} onChange={(e) => setAnnualTax(Number(e.target.value))} className="w-full p-2 bg-amber-50 border border-slate-300 rounded outline-none text-right" />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Insurance</label>
                        <input type="number" value={annualInsurance} onChange={(e) => setAnnualInsurance(Number(e.target.value))} className="w-full p-2 bg-amber-50 border border-slate-300 rounded outline-none text-right" />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">HOA / CAM</label>
                        <input type="number" value={annualHOA} onChange={(e) => setAnnualHOA(Number(e.target.value))} className="w-full p-2 bg-amber-50 border border-slate-300 rounded outline-none text-right" />
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* OUTPUTS */}
         <div className="space-y-8">
            {/* PAYMENT BREAKDOWN */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
               <div className="bg-green-100 p-4 border-b border-green-200">
                  <h2 className="font-bold text-green-900 flex items-center gap-2 text-lg">
                     Monthly Payment Breakdown
                  </h2>
               </div>
               <div className="p-6 space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                     <span className="font-bold text-slate-700">Principal & Interest:</span>
                     <span className="font-mono text-lg font-bold">${results?.monthlyPayment.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 text-sm">
                     <span className="text-slate-600">Tax & Insurance Escrow:</span>
                     <span className="font-mono">${((annualTax + annualInsurance + annualHOA) / 12).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                  
                  <div className="bg-yellow-50 p-4 rounded-lg mt-4 flex justify-between items-center border border-yellow-200">
                     <span className="font-bold text-lg text-yellow-800">TOTAL MONTHLY:</span>
                     <span className="font-bold text-2xl text-yellow-900">${totalMonthlyCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
               </div>
            </div>

            {/* BALLOON PAYMENT */}
            <div className="bg-white rounded-xl shadow-lg border-2 border-slate-800 overflow-hidden">
               <div className="bg-slate-900 p-4 border-b border-slate-700">
                  <h2 className="font-bold text-white flex items-center gap-2 text-lg">
                     <CalendarClock size={20} className="text-summit-accent" /> Balloon Payment Analysis
                  </h2>
               </div>
               <div className="p-6 text-center">
                  <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mb-2">Remaining Balance Due at End of Year {loanTermYears}</p>
                  <p className="text-4xl font-black text-slate-900 tracking-tight">${results?.balloonPayment.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                  
                  <div className="grid grid-cols-2 gap-4 mt-6 text-left bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div>
                          <p className="text-xs text-slate-500 uppercase font-bold">Principal Paid</p>
                          <p className="font-bold text-green-600">${results?.principalPaidDuringTerm.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                      </div>
                      <div>
                          <p className="text-xs text-slate-500 uppercase font-bold">Interest Paid</p>
                          <p className="font-bold text-orange-600">${results?.interestPaidDuringTerm.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                      </div>
                  </div>
               </div>
            </div>

            {/* METRICS */}
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="bg-blue-50 p-4 border-b border-blue-100">
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
               </div>
            </div>
         </div>
      </div>

      {/* AMORTIZATION SCHEDULE */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
         <div className="bg-slate-100 p-4 border-b border-slate-200 flex justify-between items-center">
             <h2 className="font-bold text-slate-800 text-lg">Amortization Schedule</h2>
             <button onClick={() => setShowFullSchedule(!showFullSchedule)} className="text-xs font-bold uppercase text-blue-600 hover:underline">
                 {showFullSchedule ? "Show Summary" : "Show Full Schedule"}
             </button>
         </div>
         <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-sm">
               <thead className="bg-slate-50 text-slate-600 uppercase text-xs font-bold sticky top-0 shadow-sm">
                  <tr>
                     <th className="p-3 border-b border-slate-200">#</th>
                     <th className="p-3 border-b border-slate-200">Date</th>
                     <th className="p-3 border-b border-slate-200 text-right">Payment</th>
                     <th className="p-3 border-b border-slate-200 text-right">Principal</th>
                     <th className="p-3 border-b border-slate-200 text-right">Interest</th>
                     <th className="p-3 border-b border-slate-200 text-right">Balance</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {results?.amortizationSchedule
                    .slice(0, showFullSchedule ? undefined : 12)
                    .map((row) => (
                    <tr key={row.paymentNumber} className="hover:bg-slate-50">
                        <td className="p-3 text-slate-500">{row.paymentNumber}</td>
                        <td className="p-3">{new Date(row.date).toLocaleDateString()}</td>
                        <td className="p-3 text-right font-medium">${row.paymentAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        <td className="p-3 text-right text-green-700">${row.principalPayment.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        <td className="p-3 text-right text-red-700">${row.interestPayment.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        <td className="p-3 text-right font-bold">${row.remainingBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                    </tr>
                  ))}
                  {/* Balloon Row */}
                  {results && (
                      <tr className="bg-slate-100 border-t-2 border-slate-300">
                          <td colSpan={5} className="p-4 text-right font-black text-slate-700 uppercase tracking-widest">Balloon Payment Due</td>
                          <td className="p-4 text-right font-black text-slate-900 text-lg">${results.balloonPayment.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                      </tr>
                  )}
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
                              <th className="p-2">Loan Amt</th>
                              <th className="p-2">Rate</th>
                              <th className="p-2">Amort / Term</th>
                              <th className="p-2">Payment</th>
                              <th className="p-2">Action</th>
                          </tr>
                      </thead>
                      <tbody>
                          {savedCalculations.map(c => (
                              <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                                  <td className="p-2">{new Date(c.timestamp).toLocaleDateString()}</td>
                                  <td className="p-2 font-mono">${c.loanAmount.toLocaleString()}</td>
                                  <td className="p-2">{c.interestRate}%</td>
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
                                        className="text-summit-accent hover:text-emerald-700 font-bold text-xs uppercase"
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