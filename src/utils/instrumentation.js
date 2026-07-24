if (typeof window !== 'undefined') {
  const isDev = import.meta.env.DEV;

  if (isDev) {
    console.log('=== TECHCONTROL INSTRUMENTATION INITIALIZED ===');
  }
  
  // Track active fetch requests
  const activeRequests = new Map();
  let requestCounter = 0;

  const originalFetch = window.fetch;
  window.fetch = async function (input, init) {
    const id = ++requestCounter;
    const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : String(input));
    const method = init?.method || 'GET';
    const startTime = Date.now();
    
    const reqInfo = { id, url, method, startTime, stack: new Error().stack };
    activeRequests.set(id, reqInfo);
    
    if (isDev) {
      console.log(`[DEBUG-FETCH-START] #${id} ${method} ${url}`);
    }
    
    // Set a timer to detect slow or hung requests
    const timeoutTimer = setTimeout(() => {
      console.warn(`[DEBUG-FETCH-SLOW] #${id} ${method} ${url} is still pending after 5s!`, reqInfo.stack);
    }, 5000);
    
    try {
      const response = await originalFetch.apply(this, arguments);
      clearTimeout(timeoutTimer);
      const duration = Date.now() - startTime;
      if (isDev) {
        console.log(`[DEBUG-FETCH-SUCCESS] #${id} ${method} ${url} resolved with status ${response.status} in ${duration}ms`);
      }
      activeRequests.delete(id);
      return response;
    } catch (err) {
      clearTimeout(timeoutTimer);
      const duration = Date.now() - startTime;
      // Real fetch error is logged on both environment levels
      console.error(`[DEBUG-FETCH-ERROR] #${id} ${method} ${url} rejected after ${duration}ms:`, err);
      activeRequests.delete(id);
      throw err;
    }
  };

  // Track WebSockets
  const activeWebSockets = new Set();
  const originalWebSocket = window.WebSocket;
  
  window.WebSocket = function (url, protocols) {
    if (isDev) {
      console.log(`[DEBUG-WS-CREATE] New WebSocket to ${url}`);
    }
    const ws = new originalWebSocket(url, protocols);
    activeWebSockets.add(ws);
    
    ws.addEventListener('open', () => {
      if (isDev) {
        console.log(`[DEBUG-WS-OPEN] Connected to ${url}`);
      }
    });
    
    ws.addEventListener('close', (event) => {
      if (isDev) {
        console.log(`[DEBUG-WS-CLOSE] Closed WebSocket to ${url}. Code: ${event.code}, Reason: ${event.reason}`);
      }
      activeWebSockets.delete(ws);
    });
    
    ws.addEventListener('error', (err) => {
      if (isDev) {
        console.error(`[DEBUG-WS-ERROR] WebSocket to ${url} error:`, err);
      }
    });
    
    return ws;
  };
  
  window.WebSocket.prototype = originalWebSocket.prototype;

  // Expose global debug API
  window.__TECHCONTROL_DEBUG__ = {
    getActiveRequests: () => Array.from(activeRequests.values()),
    getActiveWebSockets: () => Array.from(activeWebSockets).map(ws => ({ url: ws.url, readyState: ws.readyState })),
    clearAll: () => {
      activeRequests.clear();
      activeWebSockets.clear();
    }
  };
}
