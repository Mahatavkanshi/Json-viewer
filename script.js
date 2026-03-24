const DEFAULT_CONFIG = {
  firm: {
    id: "1001",
    name: "KORP Software Pvt. Ltd."
  },
  session: {
    timeoutMinutes: 30,
    cleanupIntervalMinutes: 5
  },
  otp: {
    expiryMinutes: 5,
    maxAttempts: 3,
    maxResendAttempts: 3,
    maxSendAttemptsPerIdentifier: 5,
    blockDurationMinutes: 15
  },
  rateLimit: {
    mobileVerify: {
      windowMs: 60000,
      maxRequests: 10,
      blockDurationMs: 900000
    },
    emailVerify: {
      windowMs: 60000,
      maxRequests: 10,
      blockDurationMs: 900000
    },
    panVerify: {
      windowMs: 60000,
      maxRequests: 10,
      blockDurationMs: 900000
    },
    bankVerify: {
      windowMs: 60000,
      maxRequests: 10,
      blockDurationMs: 900000
    }
  },
  document: {
    dpDocumentRequired: true,
    maxSignatureSizeKB: 45,
    maxDocumentSizeMB: 5,
    brokerageSlabs: {
      CAP: "CAP-00129",
      CUR: "NSEFX-00020A",
      COM: "COM073",
      FNO: "FNO-00136"
    }
  },
  esign: {
    environment: "production",
    pollingIntervalMs: 5000,
    maxPollingAttempts: 60
  },
  personalDetails: {
    mtfAllow: "N",
    cdsdSIAllow: "N",
    ddpiAuthOpt: "N",
    ddpiOptFlag: "N",
    ddpiOptFlagValue: "N",
    residentialStatusDisable: "N",
    sebiPastAction: "N",
    dpAvailable: "N"
  },
  exchange: {
    allowedSegments: [
      "NSE~CAP",
      "BSE~CAP",
      "NSE~FNO",
      "BSE~FNO",
      "NSE~SLB",
      "BSE~SLB",
      "MCX~COM",
      "NCDEX~COM",
      "NSE~COM",
      "BSE~COM",
      "NSE~CUR",
      "BSE~CUR",
      "BSE~MF"
    ],
    paymentEnabled: false,
    defaultBranchId: "HO",
    schemeEnabled: false,
    allowSchemeChange: false,
    paymentGateways: {
      razorpay: {
        enabled: true,
        keyId: "rzp_test_xxx",
        keySecret: "secret",
        webhookSecret: ""
      },
      cashfree: {
        enabled: false,
        keyId: "APP_ID",
        keySecret: "SECRET",
        webhookSecret: ""
      },
      atom: {
        enabled: false
      }
    }
  }
};

const formContainer = document.getElementById("formContainer");
const jsonEditor = document.getElementById("jsonEditor");
const base64Input = document.getElementById("base64Input");
const statusBar = document.getElementById("statusBar");
const viewJsonBtn = document.getElementById("viewJsonBtn");
const copyJsonBtn = document.getElementById("copyJsonBtn");
const encodeBtn = document.getElementById("encodeBtn");
const copyBase64Btn = document.getElementById("copyBase64Btn");
const decodeBtn = document.getElementById("decodeBtn");
const clearBase64Btn = document.getElementById("clearBase64Btn");
const resetDefaultsBtn = document.getElementById("resetDefaultsBtn");
const ALLOWED_SEGMENT_OPTIONS = [...DEFAULT_CONFIG.exchange.allowedSegments];

let currentConfig = mergeWithDefaults(DEFAULT_CONFIG, {});
syncPaymentGateways();

renderForm();
syncEditors("Loaded default values.");

viewJsonBtn.addEventListener("click", () => {
  jsonEditor.value = stringifyConfig(currentConfig);
  jsonEditor.focus();
  setStatus("JSON preview refreshed. Keys stay fixed, only values change.", "success");
});

copyJsonBtn.addEventListener("click", async () => {
  await copyToClipboard(jsonEditor.value, "JSON copied.");
});

encodeBtn.addEventListener("click", () => {
  base64Input.value = encodeBase64(stringifyConfig(currentConfig));
  setStatus("Base64 generated from JSON.", "success");
});

copyBase64Btn.addEventListener("click", async () => {
  await copyToClipboard(base64Input.value, "Base64 copied.");
});

decodeBtn.addEventListener("click", () => {
  applyBase64Value(base64Input.value.trim(), true);
});

clearBase64Btn.addEventListener("click", () => {
  base64Input.value = "";
  setStatus("Base64 cleared.", "success");
});

resetDefaultsBtn.addEventListener("click", () => {
  currentConfig = mergeWithDefaults(DEFAULT_CONFIG, {});
  syncPaymentGateways();
  renderForm();
  syncEditors("Default values restored.");
});

base64Input.addEventListener("input", () => {
  const value = base64Input.value.trim();

  if (!value) {
    return;
  }

  applyBase64Value(value, false);
});

base64Input.addEventListener("paste", () => {
  requestAnimationFrame(() => {
    applyBase64Value(base64Input.value.trim(), false);
  });
});

function renderForm() {
  formContainer.innerHTML = "";

  Object.entries(currentConfig).forEach(([sectionKey, sectionValue]) => {
    const section = document.createElement("section");
    section.className = "form-section";

    const title = document.createElement("h3");
    title.textContent = formatLabel(sectionKey);
    section.appendChild(title);

    section.appendChild(renderObjectFields(sectionValue, sectionKey));
    formContainer.appendChild(section);
  });

  bindInputs();
}

function renderObjectFields(obj, path) {
  const wrapper = document.createElement("div");
  wrapper.className = "field-grid";

  Object.entries(obj).forEach(([key, value]) => {
    const fullPath = `${path}.${key}`;

    if (path.startsWith("exchange.paymentGateways.") && key === "enabled") {
      return;
    }

    if (fullPath === "exchange.paymentGateways") {
      if (!currentConfig.exchange.paymentEnabled) {
        return;
      }

      const card = renderPaymentGatewayFields(value, fullPath);
      wrapper.appendChild(card);
      return;
    }

    if (Array.isArray(value)) {
      if (fullPath === "exchange.allowedSegments") {
        const card = renderAllowedSegmentsField(value, fullPath);
        wrapper.appendChild(card);
        return;
      }

      const card = document.createElement("div");
      card.className = "array-card";
      card.innerHTML = `<h4>${formatLabel(key)}</h4>`;

      const textarea = document.createElement("textarea");
      textarea.className = "array-input";
      textarea.dataset.path = fullPath;
      textarea.dataset.kind = "array";
      textarea.value = value.join("\n");
      card.appendChild(textarea);
      wrapper.appendChild(card);
      return;
    }

    if (isPlainObject(value)) {
      const card = document.createElement("div");
      card.className = "nested-card";

      const nestedTitle = document.createElement("h4");
      nestedTitle.textContent = formatLabel(key);
      card.appendChild(nestedTitle);
      card.appendChild(renderObjectFields(value, fullPath));
      wrapper.appendChild(card);
      return;
    }

    const row = document.createElement("label");
    row.className = "field-row";

    const label = document.createElement("span");
    label.className = "field-label";
    label.textContent = formatLabel(key);

    let input;

    if (typeof value === "boolean") {
      input = document.createElement("select");
      input.className = "field-input";
      input.innerHTML = '<option value="true">true</option><option value="false">false</option>';
      input.value = String(value);
      input.dataset.kind = "boolean";
    } else if (typeof value === "number") {
      input = document.createElement("input");
      input.className = "field-input";
      input.type = "number";
      input.value = String(value);
      input.dataset.kind = "number";
    } else {
      input = document.createElement("input");
      input.className = "field-input";
      input.type = "text";
      input.value = value;
      input.dataset.kind = "string";
    }

    input.dataset.path = fullPath;
    row.append(label, input);
    wrapper.appendChild(row);
  });

  return wrapper;
}

function bindInputs() {
  formContainer.querySelectorAll("[data-path]").forEach((input) => {
    input.addEventListener("input", handleFieldChange);
    input.addEventListener("change", handleFieldChange);
  });
}

function renderAllowedSegmentsField(value, path) {
  const card = document.createElement("div");
  card.className = "array-card selection-card";

  const title = document.createElement("h4");
  title.textContent = "Allowed Segments";
  card.appendChild(title);

  const list = document.createElement("div");
  list.className = "checkbox-grid";

  ALLOWED_SEGMENT_OPTIONS.forEach((segment) => {
    const option = document.createElement("label");
    option.className = "check-row";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.path = path;
    checkbox.dataset.kind = "segment-option";
    checkbox.value = segment;
    checkbox.checked = value.includes(segment);

    const text = document.createElement("span");
    text.textContent = segment;

    option.append(checkbox, text);
    list.appendChild(option);
  });

  card.appendChild(list);
  return card;
}

function renderPaymentGatewayFields(value, path) {
  const card = document.createElement("div");
  card.className = "nested-card gateway-card";

  const title = document.createElement("h4");
  title.textContent = "Payment Gateway";
  card.appendChild(title);

  const gatewaySelector = document.createElement("div");
  gatewaySelector.className = "gateway-selector";

  const selectedGateway = getSelectedGateway(value);

  Object.keys(value).forEach((gatewayName) => {
    const option = document.createElement("label");
    option.className = "check-row radio-row";

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "paymentGateway";
    radio.value = gatewayName;
    radio.dataset.path = path;
    radio.dataset.kind = "gateway-selector";
    radio.checked = gatewayName === selectedGateway;

    const text = document.createElement("span");
    text.textContent = formatLabel(gatewayName);

    option.append(radio, text);
    gatewaySelector.appendChild(option);
  });

  card.appendChild(gatewaySelector);

  const selectedValues = value[selectedGateway] || {};
  const fieldsCard = document.createElement("div");
  fieldsCard.className = "gateway-fields";

  const selectedLabel = document.createElement("h4");
  selectedLabel.textContent = `${formatLabel(selectedGateway)} Details`;
  fieldsCard.appendChild(selectedLabel);

  const visibleGatewayKeys = Object.keys(selectedValues).filter((gatewayKey) => gatewayKey !== "enabled");

  if (visibleGatewayKeys.length === 0) {
    const note = document.createElement("p");
    note.className = "gateway-note";
    note.textContent = "No extra fields for this gateway. The selection will still be saved in JSON.";
    fieldsCard.appendChild(note);
  } else {
    fieldsCard.appendChild(renderObjectFields(selectedValues, `${path}.${selectedGateway}`));
  }

  card.appendChild(fieldsCard);

  return card;
}

function handleFieldChange(event) {
  const input = event.target;
  const path = input.dataset.path;
  const kind = input.dataset.kind;
  let nextValue;

  if (kind === "segment-option") {
    updateSegmentSelection(path);
    jsonEditor.value = stringifyConfig(currentConfig);
    base64Input.value = encodeBase64(jsonEditor.value);
    setStatus("Allowed segments updated.", "success");
    return;
  }

  if (kind === "gateway-selector") {
    setSelectedGateway(input.value);
    renderForm();
    jsonEditor.value = stringifyConfig(currentConfig);
    base64Input.value = encodeBase64(jsonEditor.value);
    setStatus("Payment gateway updated.", "success");
    return;
  }

  if (kind === "number") {
    nextValue = input.value === "" ? 0 : Number(input.value);
  } else if (kind === "boolean") {
    nextValue = input.value === "true";
  } else if (kind === "array") {
    nextValue = input.value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  } else {
    nextValue = input.value;
  }

  setValueAtPath(currentConfig, path, nextValue);
  if (path === "exchange.paymentEnabled") {
    syncPaymentGateways();
    renderForm();
  }
  jsonEditor.value = stringifyConfig(currentConfig);
  base64Input.value = encodeBase64(jsonEditor.value);
  setStatus("Fields updated.", "success");
}

function syncEditors(message) {
  jsonEditor.value = stringifyConfig(currentConfig);
  base64Input.value = encodeBase64(jsonEditor.value);
  setStatus(message, "success");
}

function applyBase64Value(value, showErrors) {
  if (!value) {
    if (showErrors) {
      setStatus("Paste Base64 first.", "error");
    }
    return;
  }

  try {
    const decoded = decodeBase64(value);
    const parsed = JSON.parse(decoded);
    currentConfig = mergeWithDefaults(DEFAULT_CONFIG, parsed);
    syncPaymentGateways();
    renderForm();
    jsonEditor.value = stringifyConfig(currentConfig);
    base64Input.value = encodeBase64(jsonEditor.value);
    setStatus("Base64 added. JSON and form fields auto-filled.", "success");
  } catch (error) {
    if (showErrors) {
      setStatus("Invalid Base64 or JSON payload.", "error");
    } else {
      setStatus("Typing Base64... waiting for a valid value.", "");
    }
  }
}

function stringifyConfig(config) {
  return JSON.stringify(config, null, 2);
}

function mergeWithDefaults(defaults, source) {
  if (Array.isArray(defaults)) {
    return Array.isArray(source) && source.length ? source.slice() : defaults.slice();
  }

  if (!isPlainObject(defaults)) {
    return source === undefined ? defaults : source;
  }

  const result = {};
  const keys = new Set([...Object.keys(defaults), ...Object.keys(source || {})]);

  keys.forEach((key) => {
    const defaultValue = defaults[key];
    const sourceValue = source ? source[key] : undefined;

    if (Array.isArray(defaultValue)) {
      result[key] = Array.isArray(sourceValue) && sourceValue.length ? sourceValue.slice() : defaultValue.slice();
      return;
    }

    if (isPlainObject(defaultValue)) {
      result[key] = mergeWithDefaults(defaultValue, isPlainObject(sourceValue) ? sourceValue : {});
      return;
    }

    result[key] = sourceValue === undefined ? defaultValue : sourceValue;
  });

  return result;
}

function updateSegmentSelection(path) {
  const selected = Array.from(
    formContainer.querySelectorAll('[data-kind="segment-option"]:checked'),
    (checkbox) => checkbox.value
  );

  setValueAtPath(currentConfig, path, selected);
}

function getSelectedGateway(paymentGateways) {
  const enabledGateway = Object.entries(paymentGateways).find(([, gateway]) => gateway.enabled);
  return enabledGateway ? enabledGateway[0] : Object.keys(paymentGateways)[0];
}

function setSelectedGateway(selectedGateway) {
  Object.entries(currentConfig.exchange.paymentGateways).forEach(([gatewayName, gatewayConfig]) => {
    gatewayConfig.enabled = gatewayName === selectedGateway;
  });
}

function syncPaymentGateways() {
  const paymentGateways = currentConfig.exchange.paymentGateways;

  if (!currentConfig.exchange.paymentEnabled) {
    Object.values(paymentGateways).forEach((gatewayConfig) => {
      gatewayConfig.enabled = false;
    });
    return;
  }

  const selectedGateway = getSelectedGateway(paymentGateways);
  setSelectedGateway(selectedGateway);
}

function setValueAtPath(target, path, value) {
  const keys = path.split(".");
  let current = target;

  for (let index = 0; index < keys.length - 1; index += 1) {
    current = current[keys[index]];
  }

  current[keys[keys.length - 1]] = value;
}

function formatLabel(value) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/^./, (char) => char.toUpperCase());
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function encodeBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}

function decodeBase64(value) {
  const normalizedValue = normalizeBase64(value);
  const binary = atob(normalizedValue);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function normalizeBase64(value) {
  const sanitized = value
    .replace(/\s+/g, "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const padding = sanitized.length % 4;

  if (padding === 0) {
    return sanitized;
  }

  return sanitized.padEnd(sanitized.length + (4 - padding), "=");
}

async function copyToClipboard(value, message) {
  if (!value.trim()) {
    setStatus("Nothing to copy.", "error");
    return;
  }

  try {
    await navigator.clipboard.writeText(value);
    setStatus(message, "success");
  } catch (error) {
    setStatus("Clipboard access failed. Copy manually.", "error");
  }
}

function setStatus(message, type) {
  statusBar.textContent = message;
  statusBar.className = "status-bar";

  if (type) {
    statusBar.classList.add(type);
  }
}
