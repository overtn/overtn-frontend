window.APP_CONFIG = {
  API_BASE_URL: "https://overtn-backend.onrender.com",
};

window.apiRequest = async (path, options = {}) => {
  const baseUrl = window.APP_CONFIG.API_BASE_URL.replace(/\/+$/, "");
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, options);
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
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
