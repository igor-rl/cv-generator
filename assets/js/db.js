/**
 * db.js — Camada de persistência via IndexedDB
 * Substitui completamente o server.py + arquivos JSON do data/
 *
 * Stores:
 *   personal     — dados pessoais (single object, key = 'data')
 *   history      — histórico profissional markdown (single string, key = 'content')
 *   vagas        — lista de vagas (key = uuid)
 *   curriculos   — currículos gerados (key = vaga_uuid)
 */

const DB_NAME = 'curriculos-estrategicos';
const DB_VERSION = 1;

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('personal'))   db.createObjectStore('personal');
      if (!db.objectStoreNames.contains('history'))    db.createObjectStore('history');
      if (!db.objectStoreNames.contains('vagas'))      db.createObjectStore('vagas',     { keyPath: 'uuid' });
      if (!db.objectStoreNames.contains('curriculos')) db.createObjectStore('curriculos',{ keyPath: 'vaga_uuid' });
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

// ── API pública — mesma interface que o server.py expunha ────────────────────

const DB = {

  // ── Dados pessoais ──────────────────────────────────────────────────────
  async getPersonal() {
    return idbGet('personal', 'data');
  },
  async savePersonal(data) {
    return idbPut('personal', data, 'data');
  },

  // ── Histórico profissional (markdown) ───────────────────────────────────
  async getHistory() {
    const val = await idbGet('history', 'content');
    return val ?? '';
  },
  async saveHistory(text) {
    return idbPut('history', text, 'content');
  },

  // ── Vagas ───────────────────────────────────────────────────────────────
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
    // Apagar currículo associado
    try { await idbDelete('curriculos', uuid); } catch (_) {}
  },

  // ── Currículos ──────────────────────────────────────────────────────────
  async getCurriculo(vagaUuid) {
    const doc = await idbGet('curriculos', vagaUuid);
    if (!doc) return null;
    // Retornar sem o campo de chave interno
    const { vaga_uuid, ...rest } = doc;
    return rest;
  },
  async saveCurriculo(vagaUuid, data) {
    return idbPut('curriculos', { vaga_uuid: vagaUuid, ...data });
  },
  async deleteCurriculo(vagaUuid) {
    return idbDelete('curriculos', vagaUuid);
  },
  async existsCurriculo(vagaUuid) {
    const doc = await idbGet('curriculos', vagaUuid);
    return doc !== null;
  },

  // ── Export / Import de backup ───────────────────────────────────────────
  async exportBackup() {
    const [personal, history, vagas, curriculos] = await Promise.all([
      this.getPersonal(),
      this.getHistory(),
      this.listVagas(),
      idbGetAll('curriculos'),
    ]);
    return { version: 1, exportedAt: new Date().toISOString(), personal, history, vagas, curriculos };
  },
  async importBackup(backup) {
    if (backup.personal)  await this.savePersonal(backup.personal);
    if (backup.history)   await this.saveHistory(backup.history);
    if (backup.vagas)     for (const v of backup.vagas)     await idbPut('vagas', v);
    if (backup.curriculos) for (const c of backup.curriculos) await idbPut('curriculos', c);
  },
};

window.DB = DB;
