/**
 * @file core/router.js
 * @description Simple hash-based SPA router for page navigation
 *
 * Routes are defined as hash paths (e.g., #/home, #/portfolio)
 * The router handles page switching and navigation state
 */

const routes = new Map();
const routeListeners = new Set();
let currentRoute = null;
let defaultRoute = '/home';

/**
 * Register a route with its render function
 * @param {string} path - Route path (e.g., '/home', '/portfolio')
 * @param {Function} render - Function to render the page content
 */
export function registerRoute(path, render) {
  routes.set(path, render);
}

/**
 * Register multiple routes at once
 * @param {Object} routeMap - Object mapping paths to render functions
 */
export function registerRoutes(routeMap) {
  Object.entries(routeMap).forEach(([path, render]) => {
    registerRoute(path, render);
  });
}

/**
 * Set the default route for the app
 * @param {string} path - Default route path
 */
export function setDefaultRoute(path) {
  defaultRoute = path;
}

/**
 * Navigate to a specific route
 * @param {string} path - Route path to navigate to
 */
export function navigate(path) {
  window.location.hash = `#${path}`;
}

/**
 * Get current route path
 * @returns {string} Current route path
 */
export function getCurrentRoute() {
  return currentRoute;
}

/**
 * Subscribe to route changes
 * @param {Function} callback - Function called when route changes
 * @returns {Function} Unsubscribe function
 */
export function onRouteChange(callback) {
  if (typeof callback !== 'function') return () => {};
  routeListeners.add(callback);
  return () => routeListeners.delete(callback);
}

/**
 * Notify all route listeners of a route change
 * @param {string} route - New route path
 * @param {string} previousRoute - Previous route path
 */
function notifyListeners(route, previousRoute) {
  routeListeners.forEach(listener => {
    try {
      listener(route, previousRoute);
    } catch (error) {
      console.warn('Route listener error:', error);
    }
  });
}

/**
 * Handle hash change and render appropriate page
 */
function handleHashChange() {
  const hash = window.location.hash.slice(1) || defaultRoute;
  const path = hash.startsWith('/') ? hash : `/${hash}`;

  const previousRoute = currentRoute;
  currentRoute = path;

  // Get render function for this route
  const render = routes.get(path);

  if (render) {
    render();
    notifyListeners(path, previousRoute);
  } else {
    // Fallback to default route if route not found
    const defaultRender = routes.get(defaultRoute);
    if (defaultRender) {
      defaultRender();
      currentRoute = defaultRoute;
      notifyListeners(defaultRoute, previousRoute);
    }
  }
}

/**
 * Initialize the router
 * Sets up hash change listener and handles initial route
 */
export function initRouter() {
  window.addEventListener('hashchange', handleHashChange);

  // Handle initial route on page load
  handleHashChange();
}

/**
 * Clean up router (for testing or unmounting)
 */
export function destroyRouter() {
  window.removeEventListener('hashchange', handleHashChange);
  routes.clear();
  routeListeners.clear();
  currentRoute = null;
}
