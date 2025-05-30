import axios from 'axios';

// Configuration
const MAIN_DOMAIN = 'myapp'; // Change this to your main domain in production
// const API_PROTOCOL_HOST_PORT = 'http://localhost:8000'; // The root of your API server
const API_PROTOCOL_HOST_PORT = 'http://back.myapp:8000'; // The root of your API server
const DEFAULT_API_PATH_SEGMENT = 'api'; // The default path segment for the main 'api' instance if no subdomain

/**
 * Extracts the subdomain from the current window.location.hostname.
 * @returns {string|null} The subdomain string or null.
 */
const getSubdomain = () => {
  if (typeof window === 'undefined' || !window.location || !window.location.hostname) {
    return null;
  }
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  if (!hostname.endsWith(MAIN_DOMAIN)) {
    return null;
  }
  const mainDomainPartsCount = MAIN_DOMAIN.split('.').length;
  if (parts.length === mainDomainPartsCount) {
    return null; // It's the main domain itself
  }
  const potentialSubdomainParts = parts.slice(0, parts.length - mainDomainPartsCount);
  if (potentialSubdomainParts.length > 0) {
    return potentialSubdomainParts.join('.');
  }
  return null;
};

// Determine the base URL path for the main 'api' instance
let dynamicApiBasePathForMainApi;
const currentSubdomain = getSubdomain(); // Get subdomain once for this module's setup
console.log(`Current subdomain: ${currentSubdomain}`);

if (currentSubdomain) {
  // For the main 'api' instance, if subdomain exists, path is /subdomain
  dynamicApiBasePathForMainApi = `/${currentSubdomain}`;
} else {
  console.log('No subdomain detected, using default API path segment.');
  // Otherwise, path is /api (or your default segment)
  dynamicApiBasePathForMainApi = `/${DEFAULT_API_PATH_SEGMENT}`;
}

console.log(`Dynamic API base path for main API: ${dynamicApiBasePathForMainApi}`);

const mainApiBaseURL = `${API_PROTOCOL_HOST_PORT}${dynamicApiBasePathForMainApi}`;
// console.log(`Axios 'api' instance Base URL: ${mainApiBaseURL}`);
console.log('mainApiBaseURL:', mainApiBaseURL);
// This instance is for your regular API calls that are prefixed by subdomain or default segment (e.g., /api)
const api = axios.create({
  baseURL: mainApiBaseURL,
  withCredentials: true,
  withXSRFToken: true, // Ensures XSRF-TOKEN cookie is sent with requests
  headers: {
    'Accept': 'application/json',
  }
});

console.log('Axios "api" instance created with baseURL:', api.defaults.baseURL);

// This instance is for non-prefixed routes like /login, /logout that are always at the root of the backend domain.
const authApi = axios.create({
  baseURL: API_PROTOCOL_HOST_PORT, // Points to http://localhost:8000
  withCredentials: true,
  withXSRFToken: true, // Ensures XSRF-TOKEN cookie is sent with requests
  headers: {
    'Accept': 'application/json',
  }
});

/**
 * Fetches the CSRF token from Sanctum.
 * - If a subdomain is detected, it attempts to fetch from `/{subdomain}/sanctum/csrf-cookie`.
 * - Otherwise, it fetches from the global `/sanctum/csrf-cookie`.
 * Call this function at app initialization or before login/state-changing requests.
 */
export const fetchCsrfToken = async () => {
  try {
    // const subdomainForCsrf = getSubdomain(); // currentSubdomain is already available from module scope

    if (currentSubdomain) {
      // If subdomain exists, the main 'api' instance's baseURL is already http://host/subdomain.
      // So, api.get('/sanctum/csrf-cookie') will hit http://host/subdomain/sanctum/csrf-cookie.
      // This assumes your backend is set up to serve the CSRF cookie at this tenant-specific path.
      await api.get('/sanctum/csrf-cookie');
      // console.log(`CSRF cookie fetched via /${currentSubdomain}/sanctum/csrf-cookie`);
    } else {
      // No subdomain, use the global /sanctum/csrf-cookie via authApi (baseURL: http://host)
      await authApi.get('/sanctum/csrf-cookie');
      // console.log('CSRF cookie fetched via /sanctum/csrf-cookie (no subdomain)');
    }
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
    // Handle error appropriately, maybe retry or notify user
    // This could be a 404 if the backend isn't configured for tenant-specific CSRF routes.
  }
};

// Axios automatically handles X-XSRF-TOKEN header if XSRF-TOKEN cookie is present
// So, no specific request interceptor for CSRF is usually needed with 'withCredentials: true'.

api.interceptors.response.use(
  response => response,
  error => {
    console.error('it was in api:');
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.warn('Request unauthorized or forbidden. User might need to login.');
      // Consider redirecting to login or clearing user session data client-side here.
      // Example: if (typeof window !== 'undefined') window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Also add interceptor to authApi if needed for global error handling on those calls
authApi.interceptors.response.use(
  response => response,
  error => {
        console.error('it was in auth api:');
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.warn('Auth API request unauthorized or forbidden.');
    }
    return Promise.reject(error);
  }
);


export { api, authApi };
export default api;