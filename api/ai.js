/**
 * Vercel Serverless Function: /api/ai
 *
 * Purpose:
 * - Keep API keys on the server (Vercel env vars), not in the browser.
 * - Provide simple key rotation + cooldown on 429 / transient errors.
 * - Acts as an OpenAI-compatible proxy for providers that support /chat/completions.
 *
 * Env vars supported:
 * - APIYI_API_KEYS or APIYI_KEYS or APIYI_KEY: comma-separated or JSON array of keys (sk-...)
 * - APIYI_BASE_URL: default "https://vip.apiyi.com/v1"
 *
 * - GEMINI_API_KEYS or GEMINI_KEYS or GEMINI_KEY: comma-separated or JSON array of AI Studio keys
 * - GEMINI_BASE_URL: default "https://generativelanguage.googleapis.com/v1beta/openai"
 *
 * - AI_PROVIDER_ORDER: e.g. "apiyi,gemini" (default)
 * - AI_MAX_CONCURRENT: per-instance guard (default 30)
 * - AI_COOLDOWN_MS: default 20000
 */

function parseKeys(raw) {
  if (!raw) return [];
  const s = String(raw).trim();
  if (!s) return [];
  try {
    const arr = JSON.parse(s);
    if (Array.isArray(arr)) return arr.map(String).map(k => k.trim()).filter(Boolean);
  } catch (_) {}
  // comma-separated
  return s.split(",").map(k => k.trim()).filter(Boolean);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf-8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (e) {
    return { _raw: raw };
  }
}

// In-memory (per warm instance) rotation state
const state = {
  apiyi: { keys: [], idx: 0, stats: new Map() },
  gemini: { keys: [], idx: 0, stats: new Map() },
};
let active = 0;

function initProvider(providerName, envPrimary, envAlt, envSingle) {
  const raw = process.env[envPrimary] || process.env[envAlt] || process.env[envSingle] || "";
  const keys = parseKeys(raw);
  state[providerName].keys = keys;
  if (!state[providerName].stats) state[providerName].stats = new Map();
  for (const k of keys) {
    if (!state[providerName].stats.has(k)) {
      state[providerName].stats.set(k, { uses: 0, failures: 0, cooldownUntil: 0 });
    }
  }
}

function pickKey(providerName) {
  const provider = state[providerName];
  const keys = provider.keys || [];
  if (!keys.length) return null;

  const now = Date.now();
  // Try at most N keys to find one not in cooldown
  for (let attempts = 0; attempts < keys.length; attempts++) {
    const k = keys[provider.idx % keys.length];
    provider.idx = (provider.idx + 1) % keys.length;
    const st = provider.stats.get(k);
    if (!st || st.cooldownUntil <= now) return k;
  }
  // All cooling down: pick the one with earliest cooldown end
  let best = keys[0];
  let bestUntil = provider.stats.get(best)?.cooldownUntil ?? Infinity;
  for (const k of keys) {
    const until = provider.stats.get(k)?.cooldownUntil ?? Infinity;
    if (until < bestUntil) {
      bestUntil = until;
      best = k;
    }
  }
  return best;
}

function markSuccess(providerName, key) {
  const st = state[providerName].stats.get(key);
  if (st) st.uses += 1;
}

function markFailure(providerName, key, cooldownMs) {
  const st = state[providerName].stats.get(key);
  if (st) {
    st.failures += 1;
    st.cooldownUntil = Date.now() + cooldownMs;
  }
}

async function callOpenAICompat({ baseUrl, apiKey, body }) {
  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await resp.text();
  let json;
  try { json = JSON.parse(text); } catch (_) { json = { _raw: text }; }
  return { ok: resp.ok, status: resp.status, json };
}

module.exports = async (req, res) => {
  // Basic CORS (if you ever call from different origin)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method Not Allowed" });

  // Init keys on first request (or when env changes across deployments)
  if (!state.apiyi.keys.length) initProvider("apiyi", "APIYI_API_KEYS", "APIYI_KEYS", "APIYI_KEY");
  if (!state.gemini.keys.length) initProvider("gemini", "GEMINI_API_KEYS", "GEMINI_KEYS", "GEMINI_KEY");

  const maxConcurrent = Number(process.env.AI_MAX_CONCURRENT || 30);
  const cooldownMs = Number(process.env.AI_COOLDOWN_MS || 20000);

  if (active >= maxConcurrent) {
    res.setHeader("Retry-After", "2");
    return res.status(429).json({ success: false, error: "Server busy, please retry." });
  }

  active += 1;
  try {
    const data = await readJsonBody(req);

    const messages = data.messages;
    if (!Array.isArray(messages) || !messages.length) {
      return res.status(400).json({ success: false, error: "Missing messages[]" });
    }

    const modelPreference = Array.isArray(data.model_preference) ? data.model_preference : [data.model].filter(Boolean);
    const temperature = typeof data.temperature === "number" ? data.temperature : undefined;
    const top_p = typeof data.top_p === "number" ? data.top_p : undefined;
    const max_tokens = typeof data.max_output_tokens === "number" ? data.max_output_tokens : undefined;

    const baseBody = {
      messages,
      // provider/model selection happens below
      ...(temperature !== undefined ? { temperature } : {}),
      ...(top_p !== undefined ? { top_p } : {}),
      ...(max_tokens !== undefined ? { max_tokens } : {}),
      // pass-through extras if user sends them
      ...(data.response_format ? { response_format: data.response_format } : {}),
    };

    const providerOrder = String(process.env.AI_PROVIDER_ORDER || "apiyi,gemini")
      .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);

    const candidates = [];
    for (const provider of providerOrder) {
      if (provider === "apiyi" && state.apiyi.keys.length) candidates.push("apiyi");
      if (provider === "gemini" && state.gemini.keys.length) candidates.push("gemini");
    }
    // If env missing, still try whatever exists
    if (!candidates.length) {
      if (state.apiyi.keys.length) candidates.push("apiyi");
      if (state.gemini.keys.length) candidates.push("gemini");
    }

    let lastError = null;

    for (const providerName of candidates) {
      const baseUrl =
        providerName === "apiyi"
          ? (process.env.APIYI_BASE_URL || "https://vip.apiyi.com/v1")
          : (process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai");

      // Try each preferred model in order for this provider
      const modelsToTry = modelPreference.length ? modelPreference : ["gemini-3-flash-preview"];

      for (const model of modelsToTry) {
        // Try up to N keys (rotation) per model
        const providerKeys = state[providerName].keys;
        for (let attempt = 0; attempt < providerKeys.length; attempt++) {
          const key = pickKey(providerName);
          if (!key) break;

          const body = { ...baseBody, model };

          const resp = await callOpenAICompat({ baseUrl, apiKey: key, body });

          if (resp.ok) {
            markSuccess(providerName, key);
            const content = resp.json?.choices?.[0]?.message?.content ?? "";
            return res.status(200).json({
              success: true,
              content,
              provider: providerName,
              model,
            });
          }

          // cooldown on common transient / limit statuses
          if ([429, 500, 502, 503, 504].includes(resp.status)) {
            markFailure(providerName, key, cooldownMs);
            lastError = { provider: providerName, model, status: resp.status, detail: resp.json };
            // short jitter to avoid hammering
            await sleep(150 + Math.floor(Math.random() * 200));
            continue;
          }

          // non-retryable for this key/model/provider
          lastError = { provider: providerName, model, status: resp.status, detail: resp.json };
          break;
        }
      }
    }

    const status = (lastError && lastError.status) || 500;
    if (status === 429) res.setHeader("Retry-After", "2");
    return res.status(status).json({
      success: false,
      error: "Upstream error",
      lastError,
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: "Internal error", detail: String(e?.message || e) });
  } finally {
    active -= 1;
  }
};
