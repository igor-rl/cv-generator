/**
 * db.js — IndexedDB persistence layer v4
 * - Structured history (experiences, education, certifications, languages)
 * - AES-GCM encryption for personal data
 * - CVX export/import format (encrypted, compressed-ish)
 */

const DB_NAME    = 'curriculos-estrategicos';
const DB_VERSION = 2;

let _db = null;

// ── Crypto helpers ────────────────────────────────────────────────────────────
// Derives a stable AES-GCM key from a device fingerprint stored in localStorage.
// Key never leaves the device — it's just obfuscation against casual inspection.

const CRYPTO = (() => {
  const KEY_STORE = 'cvx_device_key';
  let _cachedKey = null;

  function getOrCreateRawKey() {
    let raw = localStorage.getItem(KEY_STORE);
    if (!raw) {
      const arr = new Uint8Array(32);
      crypto.getRandomValues(arr);
      raw = btoa(String.fromCharCode(...arr));
      localStorage.setItem(KEY_STORE, raw);
    }
    return raw;
  }

  async function getKey() {
    if (_cachedKey) return _cachedKey;
    const raw     = getOrCreateRawKey();
    const keyData = Uint8Array.from(atob(raw), c => c.charCodeAt(0));
    _cachedKey    = await crypto.subtle.importKey(
      'raw', keyData, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']
    );
    return _cachedKey;
  }

  async function encrypt(obj) {
    const key  = await getKey();
    const iv   = crypto.getRandomValues(new Uint8Array(12));
    const data = new TextEncoder().encode(JSON.stringify(obj));
    const ct   = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
    // Merge iv + ciphertext
    const out  = new Uint8Array(iv.length + ct.byteLength);
    out.set(iv, 0);
    out.set(new Uint8Array(ct), iv.length);
    return btoa(String.fromCharCode(...out));
  }

  async function decrypt(b64) {
    const key  = await getKey();
    const raw  = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const iv   = raw.slice(0, 12);
    const ct   = raw.slice(12);
    const pt   = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    return JSON.parse(new TextDecoder().decode(pt));
  }

  return { encrypt, decrypt, getOrCreateRawKey };
})();

// ── CVX format helpers ────────────────────────────────────────────────────────
// Format: "CVX1:" + base64(encrypt(JSON of backup))
// Not human-readable, encrypted, compact.

const CVX = {
  MAGIC: 'CVX1:',

  async encode(backup) {
    const encrypted = await CRYPTO.encrypt(backup);
    return CVX.MAGIC + encrypted;
  },

  async decode(str) {
    if (!str.startsWith(CVX.MAGIC)) {
      // Legacy: try plain JSON
      try { return JSON.parse(str); } catch (_) {}
      throw new Error('Formato de arquivo inválido. Esperado arquivo .cvx');
    }
    const b64 = str.slice(CVX.MAGIC.length);
    return CRYPTO.decrypt(b64);
  }
};

window.CVX = CVX;

// ── IDB helpers ───────────────────────────────────────────────────────────────

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;

      if (!db.objectStoreNames.contains('personal'))   db.createObjectStore('personal');
      if (!db.objectStoreNames.contains('vagas'))      db.createObjectStore('vagas',      { keyPath: 'uuid' });
      if (!db.objectStoreNames.contains('curriculos')) db.createObjectStore('curriculos', { keyPath: 'vaga_uuid' });
      if (!db.objectStoreNames.contains('settings'))   db.createObjectStore('settings');

      if (!db.objectStoreNames.contains('experiences')) {
        const s = db.createObjectStore('experiences', { keyPath: 'id', autoIncrement: true });
        s.createIndex('startDate', 'startDate', { unique: false });
      }
      if (!db.objectStoreNames.contains('education')) {
        const s = db.createObjectStore('education', { keyPath: 'id', autoIncrement: true });
        s.createIndex('startDate', 'startDate', { unique: false });
      }
      if (!db.objectStoreNames.contains('certifications')) {
        const s = db.createObjectStore('certifications', { keyPath: 'id', autoIncrement: true });
        s.createIndex('date', 'date', { unique: false });
      }
      if (!db.objectStoreNames.contains('languages')) {
        db.createObjectStore('languages', { keyPath: 'id', autoIncrement: true });
      }
    };

    req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror   = (e) => reject(e.target.error);
  });
}

function tx(storeName, mode = 'readonly') {
  return openDB().then(db => db.transaction(storeName, mode).objectStore(storeName));
}

function idbGet(store, key) {
  return tx(store).then(s => new Promise((res, rej) => {
    const r = s.get(key);
    r.onsuccess = () => res(r.result ?? null);
    r.onerror   = () => rej(r.error);
  }));
}

function idbPut(store, value, key) {
  return tx(store, 'readwrite').then(s => new Promise((res, rej) => {
    const r = key !== undefined ? s.put(value, key) : s.put(value);
    r.onsuccess = () => res(r.result);
    r.onerror   = () => rej(r.error);
  }));
}

function idbAdd(store, value) {
  return tx(store, 'readwrite').then(s => new Promise((res, rej) => {
    const r = s.add(value);
    r.onsuccess = () => res(r.result);
    r.onerror   = () => rej(r.error);
  }));
}

function idbDelete(store, key) {
  return tx(store, 'readwrite').then(s => new Promise((res, rej) => {
    const r = s.delete(key);
    r.onsuccess = () => res();
    r.onerror   = () => rej(r.error);
  }));
}

function idbGetAll(store) {
  return tx(store).then(s => new Promise((res, rej) => {
    const r = s.getAll();
    r.onsuccess = () => res(r.result);
    r.onerror   = () => rej(r.error);
  }));
}

// ── Public API ────────────────────────────────────────────────────────────────

const DB = {

  // ── Personal data (encrypted in storage) ──────────────────────────────────
  async getPersonal() {
    const raw = await idbGet('personal', 'data');
    if (!raw) return null;
    // If it's an object (legacy unencrypted), return as-is
    if (typeof raw === 'object') return raw;
    // If it's a string, it's encrypted
    try { return await CRYPTO.decrypt(raw); } catch (_) { return null; }
  },

  async savePersonal(data) {
    const encrypted = await CRYPTO.encrypt(data);
    return idbPut('personal', encrypted, 'data');
  },

  // ── Settings ──────────────────────────────────────────────────────────────
  getSettings()       { return idbGet('settings', 'config').then(v => v || {}); },
  saveSettings(data)  { return idbPut('settings', data, 'config'); },

  // ── Experiences ─────────────────────────────────────────────────────────────
  async listExperiences() {
    const items = await idbGetAll('experiences');
    return items.sort((a, b) => (b.startDate||'0000-00').localeCompare(a.startDate||'0000-00'));
  },

  async saveExperience(exp) {
    if (exp.id) { await idbPut('experiences', exp); return exp; }
    const id = await idbAdd('experiences', exp);
    return { ...exp, id };
  },

  deleteExperience(id) { return idbDelete('experiences', id); },

  // ── Education ────────────────────────────────────────────────────────────────
  async listEducation() {
    const items = await idbGetAll('education');
    return items.sort((a, b) => (b.startDate||'0000').localeCompare(a.startDate||'0000'));
  },

  async saveEducation(edu) {
    if (edu.id) { await idbPut('education', edu); return edu; }
    const id = await idbAdd('education', edu);
    return { ...edu, id };
  },

  deleteEducation(id) { return idbDelete('education', id); },

  // ── Certifications ────────────────────────────────────────────────────────────
  async listCertifications() {
    const items = await idbGetAll('certifications');
    return items.sort((a, b) => (b.date||'0000-00').localeCompare(a.date||'0000-00'));
  },

  async saveCertification(cert) {
    if (cert.id) { await idbPut('certifications', cert); return cert; }
    const id = await idbAdd('certifications', cert);
    return { ...cert, id };
  },

  deleteCertification(id) { return idbDelete('certifications', id); },

  // ── Languages ─────────────────────────────────────────────────────────────────
  async listLanguages() { return idbGetAll('languages'); },

  async saveLanguage(lang) {
    if (lang.id) { await idbPut('languages', lang); return lang; }
    const id = await idbAdd('languages', lang);
    return { ...lang, id };
  },

  deleteLanguage(id) { return idbDelete('languages', id); },

  // ── Build history markdown for prompt ────────────────────────────────────────
  async buildHistoryMarkdown() {
    const [exps, edu, certs, langs] = await Promise.all([
      this.listExperiences(),
      this.listEducation(),
      this.listCertifications(),
      this.listLanguages(),
    ]);

    let md = '';

    if (exps.length) {
      md += '## EXPERIÊNCIA PROFISSIONAL\n\n';
      exps.forEach(e => {
        const period = `${fmtYM(e.startDate)} – ${e.current ? 'Atual' : fmtYM(e.endDate)}`;
        md += `### ${e.company} — ${e.role} | ${period}\n`;
        if (e.location) md += `**Local:** ${e.location}\n`;
        if (e.stack)    md += `**Stack:** ${e.stack}\n`;
        if (e.description) md += `\n${e.description}\n`;
        md += '\n';
      });
    }

    if (edu.length) {
      md += '## FORMAÇÃO ACADÊMICA\n\n';
      edu.forEach(e => {
        const period = [e.startDate, e.endDate].filter(Boolean).join(' – ');
        md += `- **${e.degree}** — ${e.institution}${period ? ` (${period})` : ''}\n`;
        if (e.notes) md += `  ${e.notes}\n`;
      });
      md += '\n';
    }

    if (certs.length) {
      md += '## CERTIFICAÇÕES\n\n';
      certs.forEach(c => {
        md += `- **${c.name}** — ${c.issuer}${c.date ? ` (${c.date})` : ''}\n`;
      });
      md += '\n';
    }

    if (langs.length) {
      md += '## IDIOMAS\n\n';
      langs.forEach(l => {
        md += `- ${l.language}: ${l.proficiency}\n`;
      });
      md += '\n';
    }

    return md;
  },

  // ── Vagas ─────────────────────────────────────────────────────────────────────
  async listVagas() {
    const vagas = await idbGetAll('vagas');
    return vagas.sort((a, b) => new Date(b.data_cadastro) - new Date(a.data_cadastro));
  },

  async createVaga({ empresa, cargo, descricao }) {
    const vaga = {
      uuid: crypto.randomUUID(),
      empresa, cargo, descricao,
      status: 'criada',
      data_cadastro:    new Date().toISOString(),
      data_atualizacao: new Date().toISOString(),
    };
    await idbPut('vagas', vaga);
    return vaga;
  },

  async updateVaga(uuid, fields) {
    const vaga = await idbGet('vagas', uuid);
    if (!vaga) throw new Error('Vaga não encontrada');
    const updated = { ...vaga, ...fields, data_atualizacao: new Date().toISOString() };
    await idbPut('vagas', updated);
    return updated;
  },

  async deleteVaga(uuid) {
    await idbDelete('vagas', uuid);
    try { await idbDelete('curriculos', uuid); } catch (_) {}
  },

  // ── Curriculos ────────────────────────────────────────────────────────────────
  async getCurriculo(vagaUuid) {
    const doc = await idbGet('curriculos', vagaUuid);
    if (!doc) return null;
    const { vaga_uuid, ...rest } = doc;
    return rest;
  },

  saveCurriculo(vagaUuid, data) {
    return idbPut('curriculos', { vaga_uuid: vagaUuid, ...data });
  },

  deleteCurriculo(vagaUuid) { return idbDelete('curriculos', vagaUuid); },

  async existsCurriculo(vagaUuid) {
    const doc = await idbGet('curriculos', vagaUuid);
    return doc !== null;
  },

  // ── Backup / Restore (CVX format) ─────────────────────────────────────────────
  async exportBackup() {
    const [personal, vagas, curriculos, experiences, education, certifications, languages, settings] =
      await Promise.all([
        this.getPersonal(),
        this.listVagas(),
        idbGetAll('curriculos'),
        this.listExperiences(),
        this.listEducation(),
        this.listCertifications(),
        this.listLanguages(),
        this.getSettings(),
      ]);
    return {
      version: 4,
      exportedAt: new Date().toISOString(),
      personal, vagas, curriculos,
      experiences, education, certifications, languages, settings,
    };
  },

  async importBackup(backup) {
    if (!backup || !backup.version) throw new Error('Backup inválido ou sem versão');

    if (backup.personal) {
      // personal comes decrypted from CVX, re-encrypt for storage
      if (typeof backup.personal === 'object') {
        await this.savePersonal(backup.personal);
      }
    }
    if (backup.vagas)           for (const v of backup.vagas)          await idbPut('vagas', v);
    if (backup.curriculos)      for (const c of backup.curriculos)     await idbPut('curriculos', c);
    if (backup.experiences)     for (const e of backup.experiences)    await idbPut('experiences', e);
    if (backup.education)       for (const e of backup.education)      await idbPut('education', e);
    if (backup.certifications)  for (const c of backup.certifications) await idbPut('certifications', c);
    if (backup.languages)       for (const l of backup.languages)      await idbPut('languages', l);
    if (backup.settings)        await idbPut('settings', backup.settings, 'config');
  },
};

function fmtYM(str) {
  if (!str) return '';
  if (str.length === 4) return str;
  const [y, m] = str.split('-');
  const ms = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${ms[parseInt(m)-1]} ${y}`;
}

window.DB = DB;
window.CRYPTO = CRYPTO;