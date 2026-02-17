# Sistema de Geração Estratégica de Currículos

Sistema completo para gerenciamento de vagas e geração automatizada de currículos personalizados usando IA.

## 🚀 Funcionalidades

- **Gerenciamento de Dados Pessoais**: Armazene suas informações profissionais com controle granular sobre o que incluir em cada currículo
- **Gerenciamento de Vagas**: Cadastre, edite e acompanhe o status de vagas de interesse
- **Geração Automática de Prompt**: Crie prompts personalizados combinando seu histórico profissional com a descrição da vaga
- **Análise de Elegibilidade**: Receba avaliação automática de compatibilidade com a vaga (1-5 estrelas)
- **Currículos Estratégicos**: Gere currículos otimizados para cada vaga específica
- **Visualização e Impressão**: Visualize e exporte currículos em PDF profissional

## 📋 Pré-requisitos

- Python 3.12+
- Navegador web moderno

## 🛠️ Instalação

1. Clone o repositório:
```bash
git clone [seu-repositório]
cd [diretório-do-projeto]
```

2. Inicie o servidor:
```bash
python server.py
```

3. Acesse no navegador:
```
http://localhost:8000
```

## 📖 Como Usar

### 1. Configure Seus Dados

**Aba "Meus Dados":**
- Preencha suas informações pessoais
- Marque as checkboxes dos campos que deseja incluir nos currículos
- Cole seu histórico profissional completo em Markdown
- Clique em "Salvar Dados"

**Formato do Histórico Profissional:**
```markdown
## EXPERIÊNCIA PROFISSIONAL

### Empresa XYZ - Desenvolvedor Senior | Jan 2022 - Atual

**Stack:** Node.js, TypeScript, PostgreSQL, AWS

**Responsabilidades:**
- Desenvolvimento de APIs REST
- Arquitetura de microsserviços

**Métricas:**
- Redução de 60% na latência
- Processamento de 50M req/mês
```

### 2. Gerencie Vagas

**Aba "Vagas":**
- Clique em "Nova Vaga" para cadastrar uma oportunidade
- Preencha: Empresa, Cargo e Descrição completa da vaga
- Filtre vagas por status (Criada, Aplicada, Em Entrevista, etc.)
- Edite informações e atualize status conforme necessário

### 3. Gere Currículos

**Para cada vaga:**

1. **Clique em "Gerar Currículo"**
   - O sistema cria um prompt personalizado
   - Copie o prompt completo

2. **Use o ChatGPT**
   - Cole o prompt no ChatGPT
   - Aguarde a geração do JSON completo

3. **Cole a Resposta**
   - Clique em "Próxima Etapa"
   - Cole o JSON retornado pelo ChatGPT
   - Clique em "Gerar Currículo"

4. **Visualize e Baixe**
   - Veja a análise de elegibilidade
   - Visualize o currículo renderizado
   - Imprima ou salve como PDF
   - Baixe o JSON para backup

## 📂 Estrutura de Diretórios

```
.
├── assets/
│   ├── css/
│   │   ├── main.css        # Estilos principais
│   │   └── resume.css      # Estilos do currículo
│   └── js/
│       ├── main.js         # Gerenciamento de dados pessoais
│       └── vagas.js        # Gerenciamento de vagas e currículos
├── core/
│   ├── contracts/          # Schemas JSON
│   │   ├── elegibility.schema.json
│   │   ├── final-output.schema.json
│   │   ├── personal-history.schema.json
│   │   └── personal-info.schema.json
│   └── prompts/           # Prompts do sistema
│       ├── master-prompt.md
│       ├── fase1.md
│       ├── fase2.md
│       ├── fase3.md
│       ├── fase4.md
│       └── fase5.md
├── data/                  # Dados do usuário (criado automaticamente)
│   ├── personal-data.json
│   ├── personal-history.md
│   ├── vagas.json
│   └── curriculos/        # Currículos gerados
│       └── [uuid].json
├── index.html            # Interface principal
├── resume.html          # Visualizador de currículo
├── server.py           # Servidor backend
└── README.md          # Este arquivo
```

## 🎯 Status de Vagas

- **Criada**: Vaga cadastrada, ainda não aplicada
- **Aplicada**: Candidatura enviada
- **Em Entrevista**: Processo seletivo em andamento
- **Rejeitada**: Candidatura não aceita pela empresa
- **Desisti**: Candidato desistiu da vaga
- **Não Passei**: Não aprovado no processo

## 💾 Armazenamento de Dados

Os dados são armazenados de duas formas:

1. **Servidor (persistente)**:
   - `/data/personal-data.json` - Informações pessoais
   - `/data/personal-history.md` - Histórico profissional
   - `/data/vagas.json` - Lista de vagas
   - `/data/curriculos/[uuid].json` - Currículos gerados

2. **Browser (cache)**:
   - localStorage: currículos para acesso rápido
   - sessionStorage: currículo atual para visualização

## 🔒 Privacidade

- **Dados pessoais NÃO são enviados ao ChatGPT**
- Apenas o histórico profissional é incluído no prompt
- Informações pessoais são mescladas localmente durante a renderização
- Todos os dados ficam no seu computador local

## 🎨 Personalização de Currículos

O sistema gera currículos estratégicos através de 5 fases:

1. **Confirmação**: Valida dados recebidos
2. **Análise de Elegibilidade**: Avalia compatibilidade (1-5 ⭐)
3. **Estratégia**: Define melhor abordagem para o currículo
4. **Criação**: Gera o currículo otimizado em JSON
5. **Finalização**: Valida e entrega resultado final

## 🐛 Troubleshooting

**Erro ao salvar dados:**
- Verifique se o servidor Python está rodando
- Confirme permissões de escrita no diretório `data/`

**Currículo em branco ao imprimir:**
- Certifique-se de ter salvado seus dados pessoais
- Verifique se o JSON do ChatGPT está válido
- Tente recarregar a página de visualização

**Vaga não aparece:**
- Verifique o filtro de status selecionado
- Recarregue a página (F5)

## 📝 Formato do JSON de Saída

O ChatGPT deve retornar um JSON seguindo o schema `final-output.schema.json`:

```json
{
  "versao": "1.0.0",
  "data_geracao": "2025-02-16",
  "elegibilidade": {
    "pontuacao_estrelas": 4,
    "status": "ELEGÍVEL",
    "pontos_fortes": [...],
    "pontos_fracos": [...],
    "recomendacao": "PROSSEGUIR"
  },
  "curriculo": {
    "header": {...},
    "summary": "...",
    "core_competencies": {...},
    "experience": [...],
    "education": [...],
    "languages": [...]
  }
}
```

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para:
- Reportar bugs
- Sugerir novas funcionalidades
- Enviar pull requests

## 📄 Licença

Este projeto é de código aberto e está disponível sob a licença MIT.

## ✨ Créditos

Desenvolvido para facilitar a criação de currículos estratégicos e personalizados usando o poder da IA.