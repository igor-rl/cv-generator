/**
 * db.js — IndexedDB persistence layer
 * Extended to support structured history items, education, languages, certifications
 */

const DB_NAME    = 'curriculos-estrategicos';
const DB_VERSION = 2;

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db  = e.target.result;
      const old = e.oldVersion;

      // Always-needed stores
      if (!db.objectStoreNames.contains('personal'))   db.createObjectStore('personal');
      if (!db.objectStoreNames.contains('vagas'))      db.createObjectStore('vagas',      { keyPath: 'uuid' });
      if (!db.objectStoreNames.contains('curriculos')) db.createObjectStore('curriculos', { keyPath: 'vaga_uuid' });

      // v2 structured history
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

  // ── Personal data ──────────────────────────────────────────────────────
  getPersonal() { return idbGet('personal', 'data'); },
  savePersonal(data) { return idbPut('personal', data, 'data'); },

  // ── Experiences ─────────────────────────────────────────────────────────
  async listExperiences() {
    const items = await idbGetAll('experiences');
    return items.sort((a, b) => {
      const da = a.startDate || '0000-00';
      const db = b.startDate || '0000-00';
      return db.localeCompare(da); // newest first
    });
  },

  async saveExperience(exp) {
    if (exp.id) {
      await idbPut('experiences', exp);
      return exp;
    }
    const id = await idbAdd('experiences', exp);
    return { ...exp, id };
  },

  deleteExperience(id) { return idbDelete('experiences', id); },

  // ── Education ────────────────────────────────────────────────────────────
  async listEducation() {
    const items = await idbGetAll('education');
    return items.sort((a, b) => {
      const da = a.startDate || '0000';
      const db = b.startDate || '0000';
      return db.localeCompare(da);
    });
  },

  async saveEducation(edu) {
    if (edu.id) { await idbPut('education', edu); return edu; }
    const id = await idbAdd('education', edu);
    return { ...edu, id };
  },

  deleteEducation(id) { return idbDelete('education', id); },

  // ── Certifications ────────────────────────────────────────────────────────
  async listCertifications() {
    const items = await idbGetAll('certifications');
    return items.sort((a, b) => {
      const da = a.date || '0000-00';
      const db = b.date || '0000-00';
      return db.localeCompare(da);
    });
  },

  async saveCertification(cert) {
    if (cert.id) { await idbPut('certifications', cert); return cert; }
    const id = await idbAdd('certifications', cert);
    return { ...cert, id };
  },

  deleteCertification(id) { return idbDelete('certifications', id); },

  // ── Languages ─────────────────────────────────────────────────────────────
  async listLanguages() { return idbGetAll('languages'); },

  async saveLanguage(lang) {
    if (lang.id) { await idbPut('languages', lang); return lang; }
    const id = await idbAdd('languages', lang);
    return { ...lang, id };
  },

  deleteLanguage(id) { return idbDelete('languages', id); },

  // ── Vagas ─────────────────────────────────────────────────────────────────
  async listVagas() {
    const vagas = await idbGetAll('vagas');
    return vagas.sort((a, b) => new Date(b.data_cadastro) - new Date(a.data_cadastro));
  },

  async createVaga({ empresa, cargo, descricao }) {
    const vaga = {
      uuid: crypto.randomUUID(),
      empresa,
      cargo,
      descricao,
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

  // ── Curriculos ────────────────────────────────────────────────────────────
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

  // ── Backup ────────────────────────────────────────────────────────────────
  async exportBackup() {
    const [personal, vagas, curriculos, experiences, education, certifications, languages] =
      await Promise.all([
        this.getPersonal(),
        this.listVagas(),
        idbGetAll('curriculos'),
        this.listExperiences(),
        this.listEducation(),
        this.listCertifications(),
        this.listLanguages(),
      ]);
    return {
      version: 2,
      exportedAt: new Date().toISOString(),
      personal, vagas, curriculos,
      experiences, education, certifications, languages,
    };
  },

  async importBackup(backup) {
    if (backup.personal)      await this.savePersonal(backup.personal);
    if (backup.vagas)         for (const v of backup.vagas)          await idbPut('vagas', v);
    if (backup.curriculos)    for (const c of backup.curriculos)     await idbPut('curriculos', c);
    if (backup.experiences)   for (const e of backup.experiences)    await idbPut('experiences', e);
    if (backup.education)     for (const e of backup.education)      await idbPut('education', e);
    if (backup.certifications) for (const c of backup.certifications) await idbPut('certifications', c);
    if (backup.languages)     for (const l of backup.languages)      await idbPut('languages', l);
  },
};

function formatDateMD(str) {
  if (!str) return '';
  if (str.length === 4) return str;
  const [y, m] = str.split('-');
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${months[parseInt(m)-1]} ${y}`;
}

window.DB = DB;