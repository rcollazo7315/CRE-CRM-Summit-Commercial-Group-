
import { AmortizationScheduleItem, MortgageCalculation, MortgageCalculationResults } from "../types";

/**
 * Calculates total lease value over a term with annual escalations.
 */
export function calculateTotalLeaseValue(
  monthlyRent: number,
  termInMonths: number,
  annualIncreasePercent: number
): number {
  let total = 0;
  let currentRent = monthlyRent;
  
  for (let month = 1; month <= termInMonths; month++) {
    total += currentRent;
    
    // Apply annual increase every 12 months
    if (month % 12 === 0 && month < termInMonths) {
      currentRent = currentRent * (1 + annualIncreasePercent / 100);
    }
  }
  
  return total;
}

/**
 * Calculate monthly mortgage payment (P&I only)
 */
export function calculateMonthlyPayment(
  loanAmount: number,
  annualInterestRate: number,
  amortizationYears: number
): number {
  const monthlyRate = annualInterestRate / 100 / 12;
  const numberOfPayments = amortizationYears * 12;
  
  if (monthlyRate === 0) {
    return numberOfPayments > 0 ? loanAmount / numberOfPayments : 0;
  }
  
  const payment = loanAmount * 
    (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
    (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
  
  return payment;
}

/**
 * Calculate remaining loan balance after N payments (Balloon Payment).
 */
export function calculateRemainingBalance(
  principal: number,
  annualRate: number,
  amortizationYears: number,
  paymentsMade: number
): number {
  if (annualRate === 0) {
      const monthlyPayment = principal / (amortizationYears * 12);
      return Math.max(0, principal - (monthlyPayment * paymentsMade));
  }

  const monthlyRate = annualRate / 100 / 12;
  const totalAmortizationMonths = amortizationYears * 12;
  
  // Standard monthly payment based on amortization
  const monthlyPayment = (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -totalAmortizationMonths));
  
  // Remaining balance formula
  const remainingBalance = principal * Math.pow(1 + monthlyRate, paymentsMade)
    - monthlyPayment * ((Math.pow(1 + monthlyRate, paymentsMade) - 1) / monthlyRate);
  
  return Math.max(0, remainingBalance);
}

/**
 * Calculate balloon payment helper
 */
export function calculateBalloonPayment(
  loanAmount: number,
  annualInterestRate: number,
  amortizationYears: number,
  termYears: number
): number {
  const paymentsInTerm = termYears * 12;
  return calculateRemainingBalance(loanAmount, annualInterestRate, amortizationYears, paymentsInTerm);
}

/**
 * Generates full amortization schedule handling both term and amortization period.
 */
export function generateAmortizationSchedule(
  loanAmount: number,
  interestRate: number,
  amortizationYears: number,
  termYears: number,
  startDate: string = new Date().toISOString()
): AmortizationScheduleItem[] {
  const schedule: AmortizationScheduleItem[] = [];
  const monthlyRate = interestRate / 100 / 12;
  const totalTermMonths = termYears * 12;
  const monthlyPayment = calculateMonthlyPayment(loanAmount, interestRate, amortizationYears);
  
  let balance = loanAmount;
  let cumulativePrincipal = 0;
  let cumulativeInterest = 0;
  const start = new Date(startDate);

  for (let i = 1; i <= totalTermMonths; i++) {
    const paymentDate = new Date(start);
    paymentDate.setMonth(start.getMonth() + i - 1);

    const interest = balance * monthlyRate;
    let principal = monthlyPayment - interest;
    
    // Adjust final payment if fully amortized within term
    if (balance - principal < 0) {
        principal = balance;
    }

    balance = Math.max(0, balance - principal);
    cumulativePrincipal += principal;
    cumulativeInterest += interest;

    schedule.push({
      paymentNumber: i,
      date: paymentDate.toISOString(),
      paymentAmount: monthlyPayment,
      principalPayment: principal,
      interestPayment: interest,
      remainingBalance: balance,
      cumulativePrincipal,
      cumulativeInterest
    });

    if (balance <= 0.01) break; // Float tolerance
  }

  return schedule;
}

/**
 * Calculate complete mortgage results wrapper
 */
export function calculateMortgageResults(
  mortgage: MortgageCalculation
): MortgageCalculationResults {
  const amortizationPeriod = mortgage.loanTermYears; // This field holds Amortization Period in current type definition
  const term = mortgage.loanTerm || mortgage.loanTermYears; // This field holds Term (Balloon)

  const monthlyPayment = calculateMonthlyPayment(
    mortgage.loanAmount,
    mortgage.interestRate,
    amortizationPeriod
  );
  
  // Generate schedule up to end of term
  const amortizationSchedule = generateAmortizationSchedule(
    mortgage.loanAmount,
    mortgage.interestRate,
    amortizationPeriod,
    term
  );
  
  // Get values at end of term
  const lastPayment = amortizationSchedule[amortizationSchedule.length - 1];
  const termPayments = amortizationSchedule.length;
  const principalPaidDuringTerm = lastPayment?.cumulativePrincipal || 0;
  const interestPaidDuringTerm = lastPayment?.cumulativeInterest || 0;
  const balloonPayment = lastPayment?.remainingBalance || 0;
  
  // Calculate full amortization totals (for reference)
  const totalPaymentsFullAmort = amortizationPeriod * 12;
  const totalAmountFullAmort = monthlyPayment * totalPaymentsFullAmort;
  const totalInterestFullAmort = totalAmountFullAmort - mortgage.loanAmount;
  
  return {
    monthlyPayment,
    totalPayments: totalPaymentsFullAmort,
    totalInterest: totalInterestFullAmort,
    totalPrincipal: mortgage.loanAmount,
    termPayments,
    principalPaidDuringTerm,
    interestPaidDuringTerm,
    balloonPayment,
    amortizationSchedule
  };
}