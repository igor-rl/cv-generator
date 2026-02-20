/**
 * db.js — IndexedDB persistence layer v5
 * - Structured history (experiences, education, certifications, languages)
 * - AES-GCM encryption for personal data
 * - Backup em JSON puro (sem formato CVX)
 * - Merge inteligente por updatedAt: item mais recente sempre vence
 */

const DB_NAME    = 'curriculos-estrategicos';
const DB_VERSION = 3;

let _db = null;

// ── Crypto helpers ────────────────────────────────────────────────────────────
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

window.CRYPTO = CRYPTO;

// ── IDB helpers ───────────────────────────────────────────────────────────────

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db  = e.target.result;
      const old = e.oldVersion;

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

// ── Timestamp helpers ─────────────────────────────────────────────────────────

function nowISO() { return new Date().toISOString(); }

/** Garante que todo item tenha updatedAt */
function withTimestamp(item, isNew = false) {
  const now = nowISO();
  return {
    ...item,
    updatedAt: now,
    createdAt: isNew ? now : (item.createdAt || now),
  };
}

// ── Merge helpers ─────────────────────────────────────────────────────────────
/**
 * Compara dois itens pelo updatedAt.
 * Retorna o mais recente. Se sem data, o incoming vence.
 */
function pickNewer(existing, incoming) {
  if (!existing) return incoming;
  const dExisting = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
  const dIncoming = incoming.updatedAt ? new Date(incoming.updatedAt).getTime() : Infinity;
  return dIncoming >= dExisting ? incoming : existing;
}

/**
 * Merge genérico de uma store com keyPath.
 * Para cada item do incoming:
 * - Se não existe localmente → adiciona
 * - Se existe → compara updatedAt, mantém o mais recente
 */
async function mergeStore(storeName, incomingItems, keyField) {
  if (!incomingItems?.length) return { added: 0, updated: 0, skipped: 0 };
  let added = 0, updated = 0, skipped = 0;

  for (const incoming of incomingItems) {
    const key = incoming[keyField];
    if (key === undefined || key === null) continue;

    let existing = null;
    try { existing = await idbGet(storeName, key); } catch (_) {}

    const winner = pickNewer(existing, incoming);

    if (!existing) {
      await idbPut(storeName, winner);
      added++;
    } else if (winner === incoming) {
      await idbPut(storeName, winner);
      updated++;
    } else {
      skipped++; // local é mais recente
    }
  }

  return { added, updated, skipped };
}

/**
 * Merge para stores com autoIncrement (sem UUID).
 * Usa campo estável como chave de matching: company+role para exp, institution+degree para edu, etc.
 */
async function mergeAutoStore(storeName, incomingItems, matchFn) {
  if (!incomingItems?.length) return { added: 0, updated: 0, skipped: 0 };
  let added = 0, updated = 0, skipped = 0;

  const locals = await idbGetAll(storeName);

  for (const incoming of incomingItems) {
    // Tenta encontrar localmente pelo id (se existir) ou pela função de match
    let existing = null;
    if (incoming.id) {
      existing = locals.find(l => l.id === incoming.id) || null;
    }
    if (!existing && matchFn) {
      existing = locals.find(l => matchFn(l, incoming)) || null;
    }

    const winner = pickNewer(existing, incoming);

    if (!existing) {
      // Novo item — autoIncrement vai gerar id
      const { id: _, ...withoutId } = incoming;
      const newId = await idbAdd(storeName, { ...withoutId, updatedAt: incoming.updatedAt || nowISO(), createdAt: incoming.createdAt || nowISO() });
      added++;
    } else if (winner === incoming) {
      // Incoming é mais recente — substitui, mantendo id local
      await idbPut(storeName, { ...incoming, id: existing.id });
      updated++;
    } else {
      skipped++;
    }
  }

  return { added, updated, skipped };
}

// ── Public API ────────────────────────────────────────────────────────────────

const DB = {

  // ── Personal data (encrypted) ──────────────────────────────────────────────
  async getPersonal() {
    const raw = await idbGet('personal', 'data');
    if (!raw) return null;
    if (typeof raw === 'object') return raw; // legacy
    try { return await CRYPTO.decrypt(raw); } catch (_) { return null; }
  },

  async savePersonal(data) {
    const stamped   = { ...data, updatedAt: nowISO() };
    const encrypted = await CRYPTO.encrypt(stamped);
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
    const stamped = withTimestamp(exp, !exp.id);
    if (exp.id) { await idbPut('experiences', stamped); return stamped; }
    const id = await idbAdd('experiences', stamped);
    return { ...stamped, id };
  },

  deleteExperience(id) { return idbDelete('experiences', id); },

  // ── Education ────────────────────────────────────────────────────────────────
  async listEducation() {
    const items = await idbGetAll('education');
    return items.sort((a, b) => (b.startDate||'0000').localeCompare(a.startDate||'0000'));
  },

  async saveEducation(edu) {
    const stamped = withTimestamp(edu, !edu.id);
    if (edu.id) { await idbPut('education', stamped); return stamped; }
    const id = await idbAdd('education', stamped);
    return { ...stamped, id };
  },

  deleteEducation(id) { return idbDelete('education', id); },

  // ── Certifications ────────────────────────────────────────────────────────────
  async listCertifications() {
    const items = await idbGetAll('certifications');
    return items.sort((a, b) => (b.date||'0000-00').localeCompare(a.date||'0000-00'));
  },

  async saveCertification(cert) {
    const stamped = withTimestamp(cert, !cert.id);
    if (cert.id) { await idbPut('certifications', stamped); return stamped; }
    const id = await idbAdd('certifications', stamped);
    return { ...stamped, id };
  },

  deleteCertification(id) { return idbDelete('certifications', id); },

  // ── Languages ─────────────────────────────────────────────────────────────────
  async listLanguages() { return idbGetAll('languages'); },

  async saveLanguage(lang) {
    const stamped = withTimestamp(lang, !lang.id);
    if (lang.id) { await idbPut('languages', stamped); return stamped; }
    const id = await idbAdd('languages', stamped);
    return { ...stamped, id };
  },

  deleteLanguage(id) { return idbDelete('languages', id); },

  // ── Build history markdown ────────────────────────────────────────────────────
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
        if (e.location)    md += `**Local:** ${e.location}\n`;
        if (e.stack)       md += `**Stack:** ${e.stack}\n`;
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
    const now  = nowISO();
    const vaga = {
      uuid: crypto.randomUUID(),
      empresa, cargo, descricao,
      status:           'criada',
      data_cadastro:    now,
      data_atualizacao: now,
      updatedAt:        now,
      createdAt:        now,
    };
    await idbPut('vagas', vaga);
    return vaga;
  },

  async updateVaga(uuid, fields) {
    const vaga = await idbGet('vagas', uuid);
    if (!vaga) throw new Error('Vaga não encontrada');
    const now     = nowISO();
    const updated = { ...vaga, ...fields, data_atualizacao: now, updatedAt: now };
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
    const now = nowISO();
    return idbPut('curriculos', { vaga_uuid: vagaUuid, ...data, updatedAt: now });
  },

  deleteCurriculo(vagaUuid) { return idbDelete('curriculos', vagaUuid); },

  async existsCurriculo(vagaUuid) {
    const doc = await idbGet('curriculos', vagaUuid);
    return doc !== null;
  },

  // ── Export Backup (JSON puro) ──────────────────────────────────────────────────
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
      version:    5,
      exportedAt: nowISO(),
      personal, vagas, curriculos,
      experiences, education, certifications, languages, settings,
    };
  },

  // ── Import Backup com merge inteligente ───────────────────────────────────────
  /**
   * Regras de merge:
   * - Para cada item importado, verifica se existe localmente pelo id/uuid
   * - Se não existe: adiciona
   * - Se existe e incoming.updatedAt > local.updatedAt: substitui
   * - Se existe e incoming.updatedAt <= local.updatedAt: descarta (local é mais recente)
   * - Retorna stats de merge para exibir ao usuário
   */
  async importBackup(backup) {
    if (!backup || !backup.version) throw new Error('Backup inválido ou sem versão');

    const stats = {
      personal:       false,
      vagas:          { added: 0, updated: 0, skipped: 0 },
      curriculos:     { added: 0, updated: 0, skipped: 0 },
      experiences:    { added: 0, updated: 0, skipped: 0 },
      education:      { added: 0, updated: 0, skipped: 0 },
      certifications: { added: 0, updated: 0, skipped: 0 },
      languages:      { added: 0, updated: 0, skipped: 0 },
    };

    // Personal: compara updatedAt
    if (backup.personal && typeof backup.personal === 'object') {
      const local = await this.getPersonal();
      const localDate    = local?.updatedAt    ? new Date(local.updatedAt).getTime()    : 0;
      const incomingDate = backup.personal.updatedAt ? new Date(backup.personal.updatedAt).getTime() : Infinity;
      if (incomingDate >= localDate) {
        await this.savePersonal(backup.personal);
        stats.personal = true;
      }
    }

    // Vagas — chave: uuid
    if (backup.vagas?.length) {
      stats.vagas = await mergeStore('vagas', backup.vagas, 'uuid');
    }

    // Curriculos — chave: vaga_uuid
    if (backup.curriculos?.length) {
      stats.curriculos = await mergeStore('curriculos', backup.curriculos, 'vaga_uuid');
    }

    // Experiências — autoIncrement, match por (company + role + startDate) ou por id
    if (backup.experiences?.length) {
      stats.experiences = await mergeAutoStore('experiences', backup.experiences,
        (l, i) => l.company === i.company && l.role === i.role && l.startDate === i.startDate
      );
    }

    // Educação — match por (institution + degree)
    if (backup.education?.length) {
      stats.education = await mergeAutoStore('education', backup.education,
        (l, i) => l.institution === i.institution && l.degree === i.degree
      );
    }

    // Certificações — match por (name + issuer)
    if (backup.certifications?.length) {
      stats.certifications = await mergeAutoStore('certifications', backup.certifications,
        (l, i) => l.name === i.name && l.issuer === i.issuer
      );
    }

    // Idiomas — match por language
    if (backup.languages?.length) {
      stats.languages = await mergeAutoStore('languages', backup.languages,
        (l, i) => l.language === i.language
      );
    }

    // Settings — apenas substitui se não existir localmente ou se backup for mais recente
    if (backup.settings && Object.keys(backup.settings).length) {
      const local = await this.getSettings();
      if (!local || !Object.keys(local).length) {
        await this.saveSettings(backup.settings);
      }
    }

    return stats;
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