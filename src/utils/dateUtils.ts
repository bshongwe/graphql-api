import {
  format,
  parseISO,
  isValid,
  addDays,
  subDays,
  startOfDay,
  endOfDay,
} from 'date-fns';

export class DateUtils {
  /**
   * Format date to ISO string
   */
  static toISOString(date: Date): string {
    return date.toISOString();
  }

  /**
   * Parse ISO string to Date
   */
  static fromISOString(dateString: string): Date {
    const date = parseISO(dateString);
    if (!isValid(date)) {
      throw new Error(`Invalid date string: ${dateString}`);
    }
    return date;
  }

  /**
   * Format date for display
   */
  static formatForDisplay(
    date: Date,
    formatString = 'yyyy-MM-dd HH:mm:ss'
  ): string {
    return format(date, formatString);
  }

  /**
   * Get date range
   */
  static getDateRange(start: Date, end: Date): Date[] {
    const dates: Date[] = [];
    let currentDate = new Date(start);

    while (currentDate <= end) {
      dates.push(new Date(currentDate));
      currentDate = addDays(currentDate, 1);
    }

    return dates;
  }

  /**
   * Get start and end of day
   */
  static getDayBounds(date: Date): { start: Date; end: Date } {
    return {
      start: startOfDay(date),
      end: endOfDay(date),
    };
  }

  /**
   * Check if date is in the past
   */
  static isPast(date: Date): boolean {
    return date < new Date();
  }

  /**
   * Check if date is in the future
   */
  static isFuture(date: Date): boolean {
    return date > new Date();
  }

  /**
   * Add days to date
   */
  static addDays(date: Date, days: number): Date {
    return addDays(date, days);
  }

  /**
   * Subtract days from date
   */
  static subtractDays(date: Date, days: number): Date {
    return subDays(date, days);
  }
}
