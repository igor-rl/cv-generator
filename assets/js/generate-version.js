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
 * Também pode ser integrado em um script npm:
 *   "scripts": {
 *     "prebuild": "node generate-version.js",
 *     "serve": "node generate-version.js && python3 -m http.server 8000"
 *   }
 */

const fs   = require('fs');
const path = require('path');

// Versão baseada em timestamp (unix ms em base36 = string curta como "lzxyz123")
const version = Date.now().toString(36).toUpperCase();

const swPath    = path.join(__dirname, 'sw.js');
let   swContent = fs.readFileSync(swPath, 'utf-8');

// Substitui versão atual (seja o placeholder ou uma versão anterior)
swContent = swContent.replace(
  /const CACHE_VERSION\s*=\s*['"][^'"]*['"]/,
  `const CACHE_VERSION = '${version}'`
);

fs.writeFileSync(swPath, swContent, 'utf-8');

console.log(`✅ Cache version bumped to: ${version}`);
console.log(`   sw.js atualizado em: ${swPath}`);