#!/usr/bin/env node
/**
 * generate-version.js
 *
 * Gera um hash de versão baseado no timestamp atual e substitui
 * o placeholder '__CACHE_VERSION__' no sw.js.
 *
 * USO:
 *   node generate-version.js
 *
 * Execute ANTES de fazer deploy. Isso garante que o Service Worker
 * tenha uma versão única, forçando todos os clientes a atualizarem.
 *
 * Scripts npm:
 *   "scripts": {
 *     "prebuild": "node generate-version.js",
 *     "serve": "node generate-version.js && python3 -m http.server 8000"
 *   }
 */

const fs   = require('fs');
const path = require('path');

// Versão baseada em timestamp (unix ms em base36 = string curta, ex: "lzxyz123")
const version = Date.now().toString(36).toUpperCase();

// sw.js fica na raiz do projeto (um nível acima de assets/js/)
const swPath = path.join(__dirname, '..', '..', 'sw.js');

if (!fs.existsSync(swPath)) {
  console.error('❌ sw.js não encontrado em:', swPath);
  process.exit(1);
}

let swContent = fs.readFileSync(swPath, 'utf-8');

// Substitui versão atual (seja o placeholder ou uma versão anterior)
swContent = swContent.replace(
  /const CACHE_VERSION\s*=\s*['"][^'"]*['"]/,
  `const CACHE_VERSION = '${version}'`
);

fs.writeFileSync(swPath, swContent, 'utf-8');

console.log(`✅ Cache version bumped to: ${version}`);
console.log(`   sw.js atualizado em: ${swPath}`);