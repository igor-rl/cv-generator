/**
 * groq.js — GROQ API integration
 * Uses GROQ to generate curriculum automatically when key is configured AND enabled.
 * Falls back to manual copy/paste flow if key missing, disabled, invalid, or quota exceeded.
 */

window.GROQ = (() => {
  const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions';

  // ── Check if GROQ is active (key set + enabled) ───────────────────────────
  async function isActive() {
    const cfg = await DB.getSettings();
    const hasKey = !!(cfg.groq_key && cfg.groq_key.startsWith('gsk_'));
    const isEnabled = cfg.groq_enabled !== false; // default true
    return hasKey && isEnabled;
  }

  // ── Test connection ───────────────────────────────────────────────────────
  async function test(key) {
    try {
      const res = await fetch(GROQ_API, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: 'Reply with only: OK' }],
          max_tokens: 5,
        }),
      });

      if (res.status === 401) return { ok: false, error: 'Chave inválida (401)' };
      if (res.status === 429) return { ok: false, error: 'Quota excedida (429)' };
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };

      const data  = await res.json();
      const model = data.model || 'llama-3.3-70b-versatile';
      return { ok: true, model };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // ── Generate curriculum ───────────────────────────────────────────────────
  // Returns { ok, data } or { ok: false, fallback: true } for fallback to manual
  async function generate(prompt, onProgress) {
    const cfg = await DB.getSettings();
    const key = cfg.groq_key;

    // Respect the enable toggle
    if (cfg.groq_enabled === false) {
      return { ok: false, fallback: true, reason: 'GROQ desabilitado nas configurações' };
    }

    if (!key || !key.startsWith('gsk_')) {
      return { ok: false, fallback: true, reason: 'Chave GROQ não configurada' };
    }

    onProgress?.('Conectando ao GROQ...');

    try {
      const model = cfg.groq_model || 'llama-3.3-70b-versatile';

      const res = await fetch(GROQ_API, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 8000,
          temperature: 0.3,
        }),
      });

      if (res.status === 401) return { ok: false, fallback: true, reason: 'Chave GROQ inválida — usando fluxo manual' };
      if (res.status === 429) return { ok: false, fallback: true, reason: 'Quota GROQ excedida — usando fluxo manual' };
      if (!res.ok) {
        return { ok: false, fallback: true, reason: `GROQ erro ${res.status} — usando fluxo manual` };
      }

      onProgress?.('Processando resposta...');

      const result = await res.json();
      const text   = result.choices?.[0]?.message?.content || '';

      // Extract JSON from the response
      const parsed = extractJSON(text);
      if (!parsed) {
        return { ok: false, fallback: true, reason: 'GROQ retornou formato inválido — usando fluxo manual' };
      }

      return { ok: true, data: parsed, rawText: text };
    } catch (err) {
      // Network error → fallback
      return { ok: false, fallback: true, reason: `Erro de rede: ${err.message} — usando fluxo manual` };
    }
  }

  // ── Suggest change ────────────────────────────────────────────────────────
  async function suggestChange(currentJson, userRequest, changePrompt, onProgress) {
    const cfg = await DB.getSettings();
    const key = cfg.groq_key;

    // Respect the enable toggle
    if (cfg.groq_enabled === false) {
      return { ok: false, fallback: true, reason: 'GROQ desabilitado nas configurações' };
    }

    if (!key || !key.startsWith('gsk_')) {
      return { ok: false, fallback: true, reason: 'Chave GROQ não configurada' };
    }

    onProgress?.('Enviando sugestão ao GROQ...');

    try {
      const model = cfg.groq_model || 'llama-3.3-70b-versatile';

      // Build the change prompt by injecting the current JSON and user request
      const fullPrompt = changePrompt
        .replace('{{CURRENT_JSON}}', JSON.stringify(currentJson, null, 2))
        .replace('{{USER_REQUEST}}', userRequest);

      const res = await fetch(GROQ_API, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: fullPrompt }],
          max_tokens: 8000,
          temperature: 0.2,
        }),
      });

      if (res.status === 401) return { ok: false, fallback: true, reason: 'Chave GROQ inválida' };
      if (res.status === 429) return { ok: false, fallback: true, reason: 'Quota GROQ excedida' };
      if (!res.ok) return { ok: false, fallback: true, reason: `GROQ erro ${res.status}` };

      onProgress?.('Aplicando alterações...');

      const result = await res.json();
      const text   = result.choices?.[0]?.message?.content || '';
      const parsed = extractJSON(text);

      if (!parsed) return { ok: false, fallback: true, reason: 'GROQ retornou formato inválido' };

      return { ok: true, data: parsed };
    } catch (err) {
      return { ok: false, fallback: true, reason: err.message };
    }
  }

  // ── Extract JSON from LLM response ───────────────────────────────────────
  function extractJSON(text) {
    // Try to find JSON block
    const jsonBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonBlock) {
      try { return JSON.parse(jsonBlock[1].trim()); } catch (_) {}
    }

    // Try entire text as JSON
    const trimmed = text.trim();
    if (trimmed.startsWith('{')) {
      try { return JSON.parse(trimmed); } catch (_) {}
    }

    // Find first { ... } pair
    const start = text.indexOf('{');
    const end   = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try { return JSON.parse(text.slice(start, end + 1)); } catch (_) {}
    }

    return null;
  }

  return { test, generate, suggestChange, extractJSON, isActive };
})();