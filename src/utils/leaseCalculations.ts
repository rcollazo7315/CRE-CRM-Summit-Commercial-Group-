
import { LeaseCalculation, LeaseCalculationResults, LeasePaymentScheduleItem, LeaseYearlySummary } from '../types';

/**
 * Calculate monthly base rent based on rate type
 */
export function calculateMonthlyBaseRent(
  squareFootage: number,
  baseRentPerSqFt: number,
  baseRentType: 'annual' | 'monthly'
): number {
  if (baseRentType === 'annual') {
    return (squareFootage * baseRentPerSqFt) / 12;
  }
  return squareFootage * baseRentPerSqFt;
}

/**
 * Calculate monthly NNN charges
 */
export function calculateMonthlyNNN(
  squareFootage: number,
  nnnCharges: { propertyTaxes: number; insurance: number; cam: number }
): number {
  const totalNNNPerSqFt = nnnCharges.propertyTaxes + nnnCharges.insurance + nnnCharges.cam;
  return (squareFootage * totalNNNPerSqFt) / 12;
}

/**
 * Apply escalation logic
 */
export function applyEscalation(
  baseAmount: number,
  year: number,
  escalationType: string,
  escalationAmount: number,
  escalationStartYear: number,
  escalationFrequency: string
): number {
  if (year < escalationStartYear || escalationType === 'none') {
    return baseAmount;
  }

  const yearsSinceStart = year - escalationStartYear + 1;
  let escalationPeriods = 0;

  switch (escalationFrequency) {
    case 'annual': escalationPeriods = yearsSinceStart; break;
    case 'biennial': escalationPeriods = Math.floor(yearsSinceStart / 2); break;
    case 'every_3_years': escalationPeriods = Math.floor(yearsSinceStart / 3); break;
    case 'every_5_years': escalationPeriods = Math.floor(yearsSinceStart / 5); break;
    default: escalationPeriods = yearsSinceStart;
  }
  
  if (escalationType === 'percentage') {
    return baseAmount * Math.pow(1 + (escalationAmount / 100), escalationPeriods);
  } else if (escalationType === 'fixed_dollar') {
    return baseAmount + (escalationAmount * escalationPeriods);
  }

  return baseAmount;
}

/**
 * Generate full payment schedule with Correct Free Rent Logic
 */
export function generatePaymentSchedule(lease: LeaseCalculation): LeasePaymentScheduleItem[] {
  const schedule: LeasePaymentScheduleItem[] = [];
  const startDate = new Date(lease.leaseCommencementDate || new Date().toISOString());
  
  let cumulativeTotal = 0;
  
  // Initial Monthly Base
  const initialMonthlyRent = calculateMonthlyBaseRent(lease.squareFootage, lease.baseRentPerSqFt, lease.baseRentType);
  const initialMonthlyNNN = calculateMonthlyNNN(lease.squareFootage, lease.nnnCharges);
  const monthlyParking = lease.parkingSpaces * lease.parkingCostPerSpace;

  for (let month = 1; month <= lease.leaseTerm; month++) {
    const currentDate = new Date(startDate);
    currentDate.setMonth(startDate.getMonth() + month - 1);
    
    const year = Math.floor((month - 1) / 12) + 1;
    const monthInYear = ((month - 1) % 12) + 1;

    // Calculate THEORETICAL Base Rent with Escalations
    let theoreticalMonthlyRent = applyEscalation(
      initialMonthlyRent, year, lease.escalationType, lease.escalationAmount, lease.escalationStartYear, lease.escalationFrequency
    );

    // Calculate NNN with annual escalation
    let currentMonthlyNNN = initialMonthlyNNN;
    if (lease.nnnEscalationAmount > 0 && year > 1) {
        currentMonthlyNNN = initialMonthlyNNN * Math.pow(1 + (lease.nnnEscalationAmount / 100), year - 1);
    }

    // Handle Free Rent Logic
    let isFreeRent = false;
    let actualMonthlyRent = theoreticalMonthlyRent;

    if (lease.freeRentType === 'front_loaded' && month <= lease.freeRentMonths) {
      isFreeRent = true;
      actualMonthlyRent = 0;
    } else if (lease.freeRentType === 'back_loaded' && month > (lease.leaseTerm - lease.freeRentMonths)) {
      isFreeRent = true;
      actualMonthlyRent = 0;
    }

    // Ensure actual payment calculates 0 base rent if free
    const totalMonthly = actualMonthlyRent + currentMonthlyNNN + monthlyParking;
    cumulativeTotal += totalMonthly;

    schedule.push({
      year,
      month: monthInYear,
      monthNumber: month,
      date: currentDate.toISOString(),
      baseRent: actualMonthlyRent, // Use the 0 value if free
      theoreticalBaseRent: theoreticalMonthlyRent, // Keep track of what it *would* be
      nnn: currentMonthlyNNN,
      parking: monthlyParking,
      totalMonthly,
      isFreeRent,
      isEscalation: monthInYear === 1 && year >= lease.escalationStartYear && year > 1,
      cumulativeTotal
    });
  }

  return schedule;
}

/**
 * Summarize into years
 */
export function generateYearlySummary(lease: LeaseCalculation, schedule: LeasePaymentScheduleItem[]): LeaseYearlySummary[] {
  const years = Math.ceil(lease.leaseTerm / 12);
  const summary: LeaseYearlySummary[] = [];

  for (let year = 1; year <= years; year++) {
    const yearData = schedule.filter(i => i.year === year);
    if (!yearData.length) continue;

    // Sum the ACTUAL totals from schedule
    const totalAnnual = yearData.reduce((sum, i) => sum + i.totalMonthly, 0);
    
    // Find the standard monthly rent for this year (first non-free month, or fallback to theoretical)
    const paidMonth = yearData.find(i => !i.isFreeRent) || yearData[0];
    const baseRentPerSqFt = ((paidMonth.theoreticalBaseRent || paidMonth.baseRent) * 12) / lease.squareFootage;

    summary.push({
      year,
      baseRentPerSqFt: baseRentPerSqFt || 0,
      totalAnnual,
      freeRentMonths: yearData.filter(i => i.isFreeRent).length
    });
  }
  return summary;
}

/**
 * Main Calculation Function
 */
export function calculateLeaseResults(lease: LeaseCalculation): LeaseCalculationResults {
  const schedule = generatePaymentSchedule(lease);
  
  // Calculate Totals by Summing the Schedule (which now correctly handles 0s)
  const totalBaseRentOverTerm = schedule.reduce((sum, item) => sum + item.baseRent, 0);
  const totalNNNOverTerm = schedule.reduce((sum, item) => sum + item.nnn, 0);
  const totalParkingOverTerm = schedule.reduce((sum, item) => sum + item.parking, 0);
  
  const grandTotalOverTerm = totalBaseRentOverTerm + totalNNNOverTerm + totalParkingOverTerm;
  
  // Averages
  const averageMonthlyPayment = grandTotalOverTerm / lease.leaseTerm;
  const averageAnnualCost = (grandTotalOverTerm / lease.leaseTerm) * 12;
  const effectiveRatePerSqFt = lease.squareFootage > 0 ? averageAnnualCost / lease.squareFootage : 0;

  // First Paid Month Stats (for display)
  const firstPaidMonth = schedule.find(i => !i.isFreeRent) || schedule[0];
  const monthlyBaseRent = firstPaidMonth?.baseRent || 0;
  const monthlyNNN = firstPaidMonth?.nnn || 0;
  const monthlyParking = firstPaidMonth?.parking || 0;
  const totalMonthlyPayment = monthlyBaseRent + monthlyNNN + monthlyParking;

  const tiAllowanceTotal = lease.tenantImprovementAllowance * lease.squareFootage;

  // Calculate concession value (Theoretical Total - Actual Total)
  const theoreticalTotalBase = schedule.reduce((sum, item) => sum + (item.theoreticalBaseRent || item.baseRent), 0);
  const freeRentValue = theoreticalTotalBase - totalBaseRentOverTerm;

  return {
    monthlyBaseRent,
    monthlyNNN,
    monthlyParking,
    totalMonthlyPayment,
    annualBaseRent: monthlyBaseRent * 12,
    annualNNN: monthlyNNN * 12,
    totalAnnualCost: totalMonthlyPayment * 12,
    grandTotalOverTerm,
    averageMonthlyPayment,
    effectiveRatePerSqFt,
    totalUpfrontCosts: totalMonthlyPayment * 2, // Estimate: First + Security
    tiAllowanceTotal,
    paymentSchedule: schedule,
    freeRentValue // New field for savings
  };
}