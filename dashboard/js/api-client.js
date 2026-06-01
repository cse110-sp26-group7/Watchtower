/**
 * API client for the dashboard.
 * This module provides functions to interact with the backend API.
 */
const API_BASE_URL = "https://watchtower-api.cse110piedpiper7.workers.dev";

/**
 * Fetch events from the backend
 * @param {string} projectId
 * @param {Object} option - type, since, limit, cursor
 * @returns {Promise<{events: Array, next_cursor: string|null, has_more: boolean}>}
 */

window.getEvents = async function getEvents(projectId, option = {}) {
  const params = new URLSearchParams({ project_id: projectId });
  if (option.type) {
    params.set("type", option.type);
  }
  if (option.since) {
    params.set("since", option.since);
  }
  if (option.limit) {
    params.set("limit", option.limit);
  }
  if (option.cursor) {
    params.set("cursor", option.cursor);
  }
  const response = await fetch(`${API_BASE_URL}/api/events?${params}`);

  //Check if the response is ok or not
  if (!response.ok) throw new Error(`getEvents failed: ${response.status}`);
  return response.json();
};

/**
 * Fetches summary metrics for the dashboard
 * @param {string} projectId
 * @returns {Promise<Object>}
 */
window.getSummary = async function getSummary(projectId) {
  const params = new URLSearchParams({ project_id: projectId });
  const response = await fetch(`${API_BASE_URL}/api/summary?${params}`);
  if (!response.ok) throw new Error(`getSummary failed: ${response.status}`);
  return response.json();
};

/**
 * Fetches a single event detail
 * @param {string} eventId
 * @returns {Promise<Object>}
 */
window.getEventById = async function getEventById(eventId) {
  const response = await fetch(`${API_BASE_URL}/api/events/${eventId}`);
  if (!response.ok) throw new Error(`getEventById failed: ${response.status}`);
  return response.json();
};
