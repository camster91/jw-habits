/**
 * Retained compatibility API: automated site-data collection is disabled.
 * The user can open the official What's New page from Today instead.
 * Existing saved feed metadata is preserved but never used to claim updates.
 */
export { whatsNewPageUrl } from '../domain/whatsNew.js';
export async function fetchFeedItems() {
  return null;
}
export async function checkWhatsNew() {
  return null;
}
export function registerWhatsNewCheck() {
  return () => {};
}
