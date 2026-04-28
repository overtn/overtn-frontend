window.APP_CONFIG = {
  API_BASE_URL: "https://api.overtn.ru",
  API_FALLBACK_BASE_URL: "https://overtn-overtn-backend-6746.twc1.net",
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

const sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      if (signal) signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      window.clearTimeout(timeoutId);
      reject(new DOMException("Aborted", "AbortError"));
    };

    if (signal) {
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
    }
  });

const getRequestTimeoutMs = (path, method) => {
  if (method === "GET") return 15000;
  if (matchesApiPattern(path, SHIPPING_TIMEOUT_PATTERNS)) return 20000;
  return 20000;
};

const shouldRetryRequest = (path, method) =>
  method === "GET" && matchesApiPattern(path, API_RETRYABLE_GET_PATTERNS);

const isRetriableNetworkError = (error) => {
  const message = (error?.message || String(error || "")).toLowerCase();
  return (
    error?.code === "ETIMEDOUT" ||
    error?.name === "TypeError" ||
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("network error") ||
    message.includes("err_connection_closed") ||
    message.includes("connection closed") ||
    message.includes("timed out") ||
    message.includes("timeout")
  );
};

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
  const method = getRequestMethod(options);
  const timeoutMs = getRequestTimeoutMs(path, method);
  const useFallback = method === "GET";
  const baseUrls = [
    window.APP_CONFIG.API_BASE_URL.replace(/\/+$/, ""),
    ...(useFallback ? [window.APP_CONFIG.API_FALLBACK_BASE_URL.replace(/\/+$/, "")] : []),
  ];

  let lastError;
  for (let baseIndex = 0; baseIndex < baseUrls.length; baseIndex += 1) {
    const baseUrl = baseUrls[baseIndex];
    const fallbackUsed = baseIndex > 0;
    const maxAttempts = !fallbackUsed && shouldRetryRequest(path, method) ? 2 : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const url = `${baseUrl}${path}`;
      let durationMs = 0;
      const startedAt = performance.now();
      const timeoutState = withTimeoutSignal(options.signal, timeoutMs);
      const requestOptions = {
        cache: "no-store",
        ...options,
        signal: timeoutState.signal,
      };

      try {
        const response = await fetch(url, requestOptions);
        durationMs = Math.round(performance.now() - startedAt);
        timeoutState.cleanup();

        const contentType = response.headers.get("content-type") || "";
        const isJson = contentType.includes("application/json");
        const payload = isJson ? await response.json() : await response.text();

        if (!response.ok) {
          console.error("[apiRequest] http error", {
            baseUrl,
            path,
            attempt,
            durationMs,
            status: response.status,
            responseURL: response.url,
            reason: `HTTP ${response.status}`,
            fallbackUsed,
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
      } catch (error) {
        timeoutState.cleanup();
        durationMs = Math.round(performance.now() - startedAt);
        const timedOut = timeoutState.didTimeout();
        const abortedByCaller = error?.name === "AbortError" && !timedOut;

        if (abortedByCaller) {
          throw error;
        }

        if (timedOut && error?.name === "AbortError") {
          error = createTimeoutError(url, timeoutMs);
        }

        const reason = timedOut ? "timeout" : error?.message || String(error);
        const retriableNetworkError = isRetriableNetworkError(error);
        lastError = error;

        console.error("[apiRequest] fetch failure", {
          baseUrl,
          path,
          attempt,
          durationMs,
          reason,
          fallbackUsed,
        });

        if (attempt < maxAttempts) {
          await sleep(400, options.signal);
          continue;
        }

        if (!fallbackUsed && useFallback && retriableNetworkError) {
          break;
        }

        throw error;
      }
    }
  }

  throw lastError || new Error("Request failed");
};
