import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';

/**
 * Report Web Vitals metrics
 * @param {function} onPerfEntry - Callback function to handle metrics
 */
export function reportWebVitals(onPerfEntry) {
  if (onPerfEntry && typeof onPerfEntry === 'function') {
    onCLS(onPerfEntry);
    onFCP(onPerfEntry);
    onINP(onPerfEntry);
    onLCP(onPerfEntry);
    onTTFB(onPerfEntry);
  }
}

/**
 * Log Web Vitals to console in development
 */
export function logWebVitals() {
  if (import.meta.env.DEV) {
    reportWebVitals((metric) => {
      console.log(`[Web Vitals] ${metric.name}:`, {
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
      });
    });
  }
}

/**
 * Get rating color for a metric
 * @param {string} rating - 'good', 'needs-improvement', or 'poor'
 * @returns {string} CSS color class
 */
export function getRatingColor(rating) {
  switch (rating) {
    case 'good':
      return 'text-success';
    case 'needs-improvement':
      return 'text-warning';
    case 'poor':
      return 'text-error';
    default:
      return 'text-base-content';
  }
}
