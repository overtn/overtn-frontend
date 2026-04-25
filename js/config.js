window.APP_CONFIG = {
  API_BASE_URL: "https://api.overtn.ru",
  YANDEX_MAPS_API_KEY: "637834d8-c3a6-4c2d-a00c-75e578cebcad",
};

window.apiRequest = async (path, options = {}) => {
  const baseUrl = window.APP_CONFIG.API_BASE_URL.replace(/\/+$/, "");
  const url = `${baseUrl}${path}`;
  const startedAt = performance.now();
  const requestOptions = {
    cache: "no-store",
    ...options,
  };

  let response;
  try {
    response = await fetch(url, requestOptions);
  } catch (error) {
    const durationMs = Math.round(performance.now() - startedAt);
    console.error("[apiRequest] network error", {
      url,
      status: 0,
      responseURL: "",
      durationMs,
      message: error?.message || String(error),
    });
    throw error;
  }

  const durationMs = Math.round(performance.now() - startedAt);
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
