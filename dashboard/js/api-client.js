/**
 * API client for the dashboard.
 * This module provides functions to interact with the backend API.
 */
const API_BASE_URL = "https://watchtower-api.cse110piedpiper7.workers.dev";

//  function to make API requests with error handling and credentials included
async function apiFetch(path) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include", // sends the session cookie
    headers: {
      // for security, we require this header to be set on all API requests to prevent CSRF (Cross-Site Request Forgery) attacks. The backend will reject any request missing this header or with an incorrect value.
      "X-Watchtower-Auth": "true",
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) throw new Error(`API request failed: ${response.status}`);
  return response.json();
}

/**
 * Login with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object>}
 */
window.login = async function login(email, password) {
  const response = await fetch(`${API_BASE_URL}/api/login`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Watchtower-Auth": "true",
    },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error(`Login failed: ${response.status}`);
  return response.json();
};

/**
 * Fetch events from the backend
 * @param {string} projectId
 * @param {Object} option - type, since, limit, cursor
 * @returns {Promise<{events: Array, next_cursor: string|null, has_more: boolean}>}
 */
window.getEvents = async function getEvents(projectId, option = {}) {
  const params = new URLSearchParams({ project_id: projectId });
  if (option.type) params.set("type", option.type);
  if (option.since) params.set("since", option.since);
  if (option.limit) params.set("limit", option.limit);
  if (option.cursor) params.set("cursor", option.cursor);
  return apiFetch(`/api/events?${params}`);
};

/**
 * Fetches summary metrics for the dashboard
 * @param {string} projectId
 * @param {string} timeWindow
 * @returns {Promise<Object>}
 */
window.getSummary = async function getSummary(projectId, timeWindow) {
  const params = new URLSearchParams({
    project_id: projectId,
    window: timeWindow,
  });
  return apiFetch(`/api/summary?${params}`);
};

/**
 * Fetches a single event detail
 * @param {string} eventId
 * @returns {Promise<Object>}
 */
window.getEventById = async function getEventById(eventId) {
  return apiFetch(`/api/events/${eventId}`);
};
