import { format, parseISO, isValid, formatDistance, addDays } from 'date-fns';

export const useDateFormat = () => {
    /**
     * Format a date to display format
     * @param date - Date object or ISO string
     * @param formatStr - Format string (default: 'EEE, do MMM yyyy')
     * @returns Formatted date string
     */
    const formatDate = (
        date: Date | string,
        formatStr: string = 'EEE, do MMM yyyy'
    ): string => {
        try {
            const dateObj = typeof date === 'string' ? parseISO(date) : date;
            if (!isValid(dateObj)) return 'Invalid date';
            return format(dateObj, formatStr);
        } catch (error) {
            return 'Invalid date';
        }
    };

    /**
     * Format time to 12-hour format
     * @param time - Time string or Date
     * @returns Formatted time (e.g., "9:00 AM")
     */
    const formatTime = (time: Date | string): string => {
        try {
            const dateObj = typeof time === 'string' ? parseISO(time) : time;
            if (!isValid(dateObj)) return 'Invalid time';
            return format(dateObj, 'h:mm a');
        } catch (error) {
            return 'Invalid time';
        }
    };

    /**
     * Get relative time (e.g., "2 hours ago", "in 3 days")
     * @param date - Date object or ISO string
     * @returns Relative time string
     */
    const getRelativeTime = (date: Date | string): string => {
        try {
            const dateObj = typeof date === 'string' ? parseISO(date) : date;
            if (!isValid(dateObj)) return 'Invalid date';
            return formatDistance(dateObj, new Date(), { addSuffix: true });
        } catch (error) {
            return 'Invalid date';
        }
    };

    /**
     * Add days to a date
     * @param date - Starting date
     * @param days - Number of days to add
     * @returns New date
     */
    const addDaysToDate = (date: Date, days: number): Date => {
        return addDays(date, days);
    };

    return {
        formatDate,
        formatTime,
        getRelativeTime,
        addDaysToDate,
    };
};
