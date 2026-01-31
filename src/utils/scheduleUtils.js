// Utility functions for Sunday team rotation schedule management

/**
 * Get the next Sunday from a given date
 * @param {Date} fromDate - Starting date (default: today)
 * @returns {Date} Next Sunday
 */
export const getNextSunday = (fromDate = new Date()) => {
    const date = new Date(fromDate);
    date.setHours(0, 0, 0, 0); // Reset time to midnight

    const dayOfWeek = date.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 7 : (7 - dayOfWeek);

    date.setDate(date.getDate() + daysUntilSunday);
    return date;
};

/**
 * Check if a given date is Sunday
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if Sunday
 */
export const isSunday = (date) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.getDay() === 0;
};

/**
 * Get upcoming N Sundays from today
 * @param {number} count - Number of Sundays to get (default: 12)
 * @param {Date} startDate - Starting date (default: today)
 * @returns {Array<string>} Array of Sunday dates in YYYY-MM-DD format
 */
export const getUpcomingSundays = (count = 12, startDate = new Date()) => {
    const sundays = [];
    let currentDate = getNextSunday(startDate);

    for (let i = 0; i < count; i++) {
        sundays.push(formatDateForSchedule(currentDate));
        currentDate.setDate(currentDate.getDate() + 7); // Next Sunday
    }

    return sundays;
};

/**
 * Format date to YYYY-MM-DD for schedule storage
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDateForSchedule = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Generate rotation schedule for Sunday teams
 * @param {Array} teams - Array of Sunday team objects
 * @param {Date} startDate - Starting date for schedule
 * @param {number} weeks - Number of weeks to generate (default: 12)
 * @returns {Array} Array of schedule objects
 */
export const generateRotationSchedule = (teams, startDate = new Date(), weeks = 12) => {
    if (!teams || teams.length === 0) {
        return [];
    }

    // Sort teams alphabetically for consistent rotation
    const sortedTeams = [...teams].sort((a, b) => a.name.localeCompare(b.name));

    const sundays = getUpcomingSundays(weeks, startDate);
    const schedule = [];

    sundays.forEach((sunday, index) => {
        const team = sortedTeams[index % sortedTeams.length];
        schedule.push({
            date: sunday,
            teamId: team.id,
            teamName: team.name,
            createdBy: 'auto',
            createdAt: new Date()
        });
    });

    return schedule;
};

/**
 * Get the last scheduled Sunday from existing schedule
 * @param {Array} existingSchedule - Current schedule array
 * @returns {Date|null} Last scheduled Sunday or null
 */
export const getLastScheduledSunday = (existingSchedule) => {
    if (!existingSchedule || existingSchedule.length === 0) {
        return null;
    }

    // Sort by date descending
    const sorted = [...existingSchedule].sort((a, b) =>
        new Date(b.date) - new Date(a.date)
    );

    return new Date(sorted[0].date);
};

/**
 * Determine next team in rotation based on last scheduled team
 * @param {Array} teams - Array of Sunday team objects
 * @param {string} lastTeamId - ID of last scheduled team
 * @returns {Object|null} Next team object
 */
export const getNextTeamInRotation = (teams, lastTeamId) => {
    if (!teams || teams.length === 0) {
        return null;
    }

    const sortedTeams = [...teams].sort((a, b) => a.name.localeCompare(b.name));

    if (!lastTeamId) {
        return sortedTeams[0]; // Start with first team
    }

    const currentIndex = sortedTeams.findIndex(t => t.id === lastTeamId);

    if (currentIndex === -1) {
        return sortedTeams[0]; // Team not found, start over
    }

    const nextIndex = (currentIndex + 1) % sortedTeams.length;
    return sortedTeams[nextIndex];
};

/**
 * Format date for display (e.g., "Feb 02, 2026")
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDateForDisplay = (date) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
    });
};

/**
 * Check if a date is in the past
 * @param {string|Date} date - Date to check
 * @returns {boolean} True if date is in the past
 */
export const isPastDate = (date) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
};
