# Currículos Estratégicos — Gerador de Currículos com IA

**Versão:** 5.0.4  
**Autor:** Igor Lage  
**Descrição:** Este projeto é um gerador de currículos estratégicos utilizando LLMs, PWA offline-first, com SPA e roteamento cliente.

---

## 🚀 Funcionalidades
- Geração automatizada de currículos baseada em histórico profissional e vaga alvo
- SPA (Single Page Application) com roteamento hash fallback para `file://` e History API para servidor
- Integração LLM para análise de elegibilidade e sugestão de estratégia de currículo
- Estrutura PWA para funcionamento offline
- JSON final padronizado para envio a sistemas de RH ou exportação

---

## 🛠️ Tecnologias
- Node.js, TypeScript
- Express (servidor local e fallback SPA)
- HTML/CSS/JS para front-end
- Python (opcional, para scripts auxiliares)
- Docker para desenvolvimento e deploy consistente
- Vercel / Netlify para deploy de produção

---

## ⚡ Instalação / Desenvolvimento Local

### Pré-requisitos
- Node.js >= 20
- npm ou yarn
- Docker (opcional, recomendado para ambiente isolado)

### Rodando sem Docker
```bash
# Instalar dependências
npm install

# Servir projeto local (Node)
npm run serve:node

# Servir projeto local (Python HTTP server)
npm run serve