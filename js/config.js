window.APP_CONFIG = {
  API_BASE_URL: "https://api.overtn.ru",
  YANDEX_MAPS_API_KEY: "637834d8-c3a6-4c2d-a00c-75e578cebcad",
};

const API_RETRYABLE_GET_PATTERNS = [
  /^\/api\/v1\/catalog\/products(?:\/[^/?#]+)?(?:\?.*)?$/,
  /^\/api\/v1\/shipping\/cdek\/cities(?:\?.*)?$/,
  /^\/api\/v1\/shipping\/cdek\/pvz(?:\?.*)?$/,
  /^\/api\/v1\/shipping\/address-suggest(?:\?.*)?$/,
];

const SHIPPING_TIMEOUT_PATTERNS = [
  /^\/api\/v1\/shipping\/cdek\/cities(?:\?.*)?$/,
  /^\/api\/v1\/shipping\/cdek\/pvz(?:\?.*)?$/,
  /^\/api\/v1\/shipping\/address-suggest(?:\?.*)?$/,
  /^\/api\/v1\/shipping\/cdek\/quote(?:\?.*)?$/,
];

const matchesApiPattern = (path, patterns) => patterns.some((pattern) => pattern.test(path));

const getRequestMethod = (options) => (options.method || "GET").toUpperCase();

const getRequestTimeoutMs = (path, method) => {
  if (method !== "GET" && !matchesApiPattern(path, SHIPPING_TIMEOUT_PATTERNS)) return 5000;
  if (matchesApiPattern(path, SHIPPING_TIMEOUT_PATTERNS)) return 7000;
  return 5000;
};

const shouldRetryRequest = (path, method) =>
  method === "GET" && matchesApiPattern(path, API_RETRYABLE_GET_PATTERNS);

const createTimeoutError = (url, timeoutMs) => {
  const error = new Error(`Request timed out after ${timeoutMs}ms`);
  error.name = "AbortError";
  error.code = "ETIMEDOUT";
  error.url = url;
  error.timeoutMs = timeoutMs;
  return error;
};

const withTimeoutSignal = (signal, timeoutMs) => {
  const controller = new AbortController();
  let didTimeout = false;

  const timeoutId = window.setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, timeoutMs);

  const abortFromParent = () => controller.abort();
  if (signal) {
    if (signal.aborted) {
      window.clearTimeout(timeoutId);
      controller.abort();
    } else {
      signal.addEventListener("abort", abortFromParent, { once: true });
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      window.clearTimeout(timeoutId);
      if (signal) signal.removeEventListener("abort", abortFromParent);
    },
    didTimeout: () => didTimeout,
  };
};

window.apiRequest = async (path, options = {}) => {
  const baseUrl = window.APP_CONFIG.API_BASE_URL.replace(/\/+$/, "");
  const url = `${baseUrl}${path}`;
  const method = getRequestMethod(options);
  const timeoutMs = getRequestTimeoutMs(path, method);
  const maxAttempts = shouldRetryRequest(path, method) ? 2 : 1;

  let response;
  let durationMs = 0;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const startedAt = performance.now();
    const timeoutState = withTimeoutSignal(options.signal, timeoutMs);
    const requestOptions = {
      cache: "no-store",
      ...options,
      signal: timeoutState.signal,
    };

    try {
      response = await fetch(url, requestOptions);
      durationMs = Math.round(performance.now() - startedAt);
      timeoutState.cleanup();
      break;
    } catch (error) {
      timeoutState.cleanup();
      const durationMs = Math.round(performance.now() - startedAt);
      const timedOut = timeoutState.didTimeout();
      const abortedByCaller = error?.name === "AbortError" && !timedOut;
      const logPayload = {
        url,
        attempt,
        durationMs,
        ...(timedOut ? { timeout: true, timeoutMs } : { networkError: true }),
        message: error?.message || String(error),
      };

      if (!abortedByCaller) {
        console.error("[apiRequest] fetch failure", logPayload);
      }

      if (abortedByCaller) {
        throw error;
      }

      if (timedOut && error?.name === "AbortError") {
        error = createTimeoutError(url, timeoutMs);
      }

      if (attempt >= maxAttempts) {
        throw error;
      }
    }
  }

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    console.error("[apiRequest] http error", {
      url,
      status: response.status,
      responseURL: response.url,
      durationMs,
    });
    const message =
      (typeof payload === "object" && payload !== null && (payload.message || payload.error)) ||
      (typeof payload === "string" && payload) ||
      `HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};
