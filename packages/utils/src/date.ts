/**
 * Date utilities
 */

export function toISO8601(date: Date | string | number): string {
  if (typeof date === 'string' || typeof date === 'number') {
    return new Date(date).toISOString();
  }
  return date.toISOString();
}

export function isValidISO8601(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date.toISOString() === dateString;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}
