const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Fetch wrapper with error handling
 */
async function fetchAPI(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || error.message || 'Request failed');
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error.message);
    throw error;
  }
}

/**
 * Daily Text API
 */
export const dailyTextAPI = {
  /**
   * Get today's daily text
   */
  getToday: async () => {
    return await fetchAPI('/daily-text/today');
  },

  /**
   * Get daily text for a specific date
   * @param {string} date - Date in YYYY-MM-DD format
   */
  getByDate: async (date) => {
    return await fetchAPI(`/daily-text/${date}`);
  },
};

/**
 * Bible Reading API
 */
export const bibleReadingAPI = {
  /**
   * Get today's Bible reading
   */
  getToday: async () => {
    return await fetchAPI('/bible-reading/today');
  },

  /**
   * Get Bible reading for a specific day of year
   * @param {number} dayOfYear - Day of year (1-366)
   */
  getByDay: async (dayOfYear) => {
    return await fetchAPI(`/bible-reading/day/${dayOfYear}`);
  },

  /**
   * Get yearly progress
   */
  getProgress: async () => {
    return await fetchAPI('/bible-reading/progress');
  },

  /**
   * Get reading range
   * @param {number} start - Start day of year
   * @param {number} end - End day of year
   */
  getRange: async (start, end) => {
    return await fetchAPI(`/bible-reading/range?start=${start}&end=${end}`);
  },
};

/**
 * Meetings API
 */
export const meetingsAPI = {
  /**
   * Get current week's meeting schedule
   */
  getCurrent: async () => {
    return await fetchAPI('/meetings/current');
  },

  /**
   * Get meeting schedule for a specific week
   * @param {number} year - Year
   * @param {number} weekNumber - Week number (1-53)
   */
  getByWeek: async (year, weekNumber) => {
    return await fetchAPI(`/meetings/week/${year}/${weekNumber}`);
  },

  /**
   * Clear meetings cache
   */
  clearCache: async () => {
    return await fetchAPI('/meetings/clear-cache', { method: 'POST' });
  },
};

/**
 * Check if backend API is available
 */
export async function checkAPIHealth() {
  try {
    const response = await fetch(`${API_URL.replace('/api', '')}/health`);
    return response.ok;
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
}

export default {
  dailyText: dailyTextAPI,
  bibleReading: bibleReadingAPI,
  meetings: meetingsAPI,
  checkHealth: checkAPIHealth,
};
