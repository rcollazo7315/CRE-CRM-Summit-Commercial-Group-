
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
 * Calculates remaining loan balance after N payments (Balloon Payment).
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
 * Generates an amortization schedule handling both term and amortization period.
 */
export function generateAmortizationSchedule(
  loanAmount: number,
  interestRate: number,
  amortizationYears: number,
  termYears: number
): Array<{
  paymentNumber: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
  date: Date;
}> {
  const schedule = [];
  let balance = loanAmount;
  const monthlyRate = interestRate / 100 / 12;
  const totalAmortizationMonths = amortizationYears * 12;
  const totalTermMonths = termYears * 12;
  const today = new Date();

  // Calculate fixed monthly payment based on Amortization
  let monthlyPayment = 0;
  if (interestRate === 0) {
      monthlyPayment = loanAmount / totalAmortizationMonths;
  } else {
      monthlyPayment = (loanAmount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -totalAmortizationMonths));
  }

  for (let i = 1; i <= totalTermMonths; i++) {
    const interest = balance * monthlyRate;
    let principal = monthlyPayment - interest;
    
    // Adjust final payment if fully amortized within term
    if (balance - principal < 0) {
        principal = balance;
    }

    balance -= principal;
    const date = new Date(today.getFullYear(), today.getMonth() + i, 1);

    schedule.push({
      paymentNumber: i,
      payment: monthlyPayment,
      principal,
      interest,
      balance,
      date
    });

    if (balance <= 0) break;
  }

  return schedule;
}
