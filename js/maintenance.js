(function () {
  const bypassKey = "overtn_maintenance_bypass";
  const salesStoppedKey = "overtn_sales_stopped";
  const apiBase = window.APP_CONFIG?.API_BASE_URL?.replace(/\/+$/, "");
  if (!apiBase) return;

  const requestJson = async (path, options = {}) => {
    const response = await fetch(`${apiBase}${path}`, {
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(payload?.message || payload?.error || `HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return payload;
  };

  const showGate = () => {
    if (document.querySelector("[data-maintenance-gate]")) return;
    const style = document.createElement("style");
    style.textContent = `
      body.maintenance-active > :not([data-maintenance-gate]) { display: none !important; }
      .maintenance-gate {
        position: fixed;
        inset: 0;
        z-index: 99999;
        display: grid;
        place-items: center;
        padding: 24px;
        background: #ffffff;
        color: #1e1a17;
        font-family: "Manrope", "Helvetica Neue", sans-serif;
      }
      .maintenance-gate__panel {
        width: min(100%, 360px);
        display: grid;
        gap: 14px;
        text-align: center;
      }
      .maintenance-gate h1 {
        margin: 0;
        font-size: 22px;
        font-weight: 600;
        letter-spacing: 0;
      }
      .maintenance-gate p {
        margin: 0;
        color: #6d5e56;
        font-size: 14px;
      }
      .maintenance-gate input,
      .maintenance-gate button {
        width: 100%;
        border-radius: 999px;
        border: 1px solid rgba(20, 16, 14, 0.14);
        padding: 12px 16px;
        font: inherit;
      }
      .maintenance-gate button {
        cursor: pointer;
        background: #1e1a17;
        color: #ffffff;
      }
      .maintenance-gate__error {
        min-height: 18px;
        color: #b24436;
        font-size: 13px;
      }
    `;
    const gate = document.createElement("div");
    gate.className = "maintenance-gate";
    gate.setAttribute("data-maintenance-gate", "");
    gate.innerHTML = `
      <form class="maintenance-gate__panel" data-maintenance-form>
        <h1>OVERTN временно закрыт</h1>
        <p>Введите пароль для доступа</p>
        <input type="password" autocomplete="current-password" data-maintenance-password />
        <button type="submit">Войти</button>
        <div class="maintenance-gate__error" data-maintenance-error></div>
      </form>
    `;
    document.head.appendChild(style);
    document.body.appendChild(gate);
    document.body.classList.add("maintenance-active");

    const form = gate.querySelector("[data-maintenance-form]");
    const input = gate.querySelector("[data-maintenance-password]");
    const errorEl = gate.querySelector("[data-maintenance-error]");
    input.focus();
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      errorEl.textContent = "";
      try {
        await requestJson("/api/v1/site-status/unlock", {
          method: "POST",
          body: JSON.stringify({ password: input.value }),
        });
        localStorage.setItem(bypassKey, "true");
        document.body.classList.remove("maintenance-active");
        gate.remove();
        style.remove();
      } catch (error) {
        errorEl.textContent = error.status === 503 ? "Пароль временно не настроен." : "Неверный пароль";
      }
    });
  };

  const checkStatus = async () => {
    try {
      const status = await requestJson("/api/v1/site-status");
      window.OVERTN_SITE_STATUS = status;
      localStorage.setItem(salesStoppedKey, status.salesStopped ? "true" : "false");
      window.dispatchEvent(new CustomEvent("overtn:site-status", { detail: status }));
      if (status.maintenanceMode && localStorage.getItem(bypassKey) !== "true") showGate();
    } catch (error) {
      console.warn("[maintenance] status check failed", error);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", checkStatus, { once: true });
  } else {
    void checkStatus();
  }
})();
