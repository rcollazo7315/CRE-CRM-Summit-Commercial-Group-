
// src/utils/dateUtils.ts

/**
 * Adds days to a given date string (YYYY-MM-DD) and returns ISO string.
 */
export const addDaysToDate = (dateStr: string, days: number): string => {
  if (!dateStr) return '';
  // Append T12:00:00 to avoid timezone rollover issues with simple dates
  const date = new Date(`${dateStr}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

/**
 * Calculates days remaining until a deadline.
 * Returns negative if overdue.
 */
export const getDaysRemaining = (deadlineStr: string): number => {
  if (!deadlineStr) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const deadline = new Date(`${deadlineStr}T12:00:00`);
  deadline.setHours(0, 0, 0, 0);
  
  const diffTime = deadline.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Returns a color class based on urgency.
 */
export const getDeadlineColor = (daysRemaining: number, isCompletedOrWaived: boolean): string => {
  if (isCompletedOrWaived) return 'text-slate-400 bg-slate-100';
  if (daysRemaining < 0) return 'text-red-700 bg-red-100 border-red-200'; // Overdue
  if (daysRemaining <= 3) return 'text-red-600 bg-red-50 border-red-100'; // Critical
  if (daysRemaining <= 7) return 'text-amber-700 bg-amber-50 border-amber-100'; // Warning
  return 'text-emerald-700 bg-emerald-50 border-emerald-100'; // Safe
};

/**
 * Returns a color class for the icon/badge specifically
 */
export const getUrgencyColorClass = (daysRemaining: number): string => {
  if (daysRemaining < 0) return 'bg-red-500';
  if (daysRemaining <= 3) return 'bg-red-500';
  if (daysRemaining <= 7) return 'bg-amber-500';
  return 'bg-emerald-500';
};

/**
 * Checks if a deadline is valid (not empty).
 */
export const isValidDate = (dateStr: string | undefined): boolean => {
  return !!dateStr && !isNaN(new Date(dateStr).getTime());
};
