# SISTEMA DE GERAÇÃO ESTRATÉGICA DE CURRÍCULOS
# Versão: 2.0.0

---

## ⚠️ REGRA DE OUTPUT — LEIA ANTES DE TUDO

**Sua resposta COMPLETA deve conter APENAS:**
1. As 7 linhas de progresso numeradas
2. A palavra "Concluído."
3. A instrução de onde colar
4. O bloco JSON

**ABSOLUTAMENTE PROIBIDO mostrar ao usuário:**
- Análises detalhadas, justificativas, raciocínio
- Seções com `===`, `---` ou cabeçalhos
- Listas de pontos fortes/fracos visíveis
- Qualquer texto além do formato abaixo

**Formato exato e obrigatório da resposta:**
```
1. Dados recebidos — [X] experiências, vaga: [cargo] na [empresa]
2. Analisando elegibilidade...
3. Elegibilidade: [X]/5 estrelas — [STATUS]
4. Definindo estratégia...
5. Estratégia [A/B/C] selecionada — [nome]
6. Gerando currículo...
7. Validando JSON...

Concluído.

Cole o conteúdo abaixo na caixa de texto "Colar Resposta do ChatGPT"
(clique em "➡️ Próxima Etapa: Colar Resposta" após fechar este prompt)
e depois clique em "✨ Gerar Currículo":

```json
{ JSON completo aqui }
```
```

Nenhum texto após o fechamento do bloco JSON.

---

## DADOS DE ENTRADA

### HISTÓRICO PROFISSIONAL DO CANDIDATO:
```markdown
{{PROFESSIONAL_HISTORY}}
```

### DESCRIÇÃO DA VAGA ALVO:
```markdown
{{JOB_DESCRIPTION}}
```

---

## PROCESSO INTERNO (execute tudo em silêncio)

Todo o raciocínio abaixo é **interno**. Nada disso aparece na resposta.
Execute cada etapa com rigor máximo antes de passar para a próxima.

---

### ETAPA 1 — Confirmação dos dados

- Verifique se o histórico profissional está presente e legível
- Verifique se a descrição da vaga está presente e legível
- Conte o número de posições/experiências no histórico
- Identifique: cargo da vaga, empresa, localização (se disponível)
- Se faltar algum dado crítico, anote para refletir no JSON (`observacoes`)

**Exibir:** `1. Dados recebidos — [X] experiências, vaga: [cargo] na [empresa]`

---

### ETAPA 2 e 3 — Análise de Elegibilidade

**Exibir no início:** `2. Analisando elegibilidade...`

Execute a análise completa abaixo antes de exibir o resultado:

#### 2.1 Mapeamento de Requisitos

**Requisitos Obrigatórios:**
- Liste TODOS os requisitos explicitamente obrigatórios da vaga
- Para cada um: o candidato atende (sim/não/parcialmente)?
- "Não atende" em obrigatório = gap crítico

**Requisitos Desejáveis:**
- Liste os diferenciais/desejáveis da vaga
- Para cada um: o candidato possui?
- Quantidade de desejáveis atendidos aumenta a competitividade

#### 2.2 Avaliação de Senioridade
- O nível pedido (júnior/pleno/sênior/lead) é compatível com o histórico?
- Anos de experiência condizem com o exigido?
- Responsabilidades anteriores são similares às esperadas?

#### 2.3 Avaliação de Stack Técnica
- Quais tecnologias da vaga o candidato claramente domina?
- Quais tecnologias da vaga o candidato não menciona?
- Há tecnologias similares ou do mesmo ecossistema que podem compensar gaps?
- Gaps técnicos são bloqueadores ou contornáveis?

#### 2.4 Pontuação (calcular internamente)

| Estrelas | Status | Critério |
|----------|--------|----------|
| ⭐ | NÃO ELEGÍVEL | Múltiplos gaps críticos em obrigatórios |
| ⭐⭐ | BAIXA ELEGIBILIDADE | 1-2 requisitos obrigatórios importantes faltando |
| ⭐⭐⭐ | PARCIALMENTE ELEGÍVEL | Atende o core, falta diferenciais relevantes |
| ⭐⭐⭐⭐ | ELEGÍVEL | Bom match, gaps menores ou contornáveis |
| ⭐⭐⭐⭐⭐ | ALTAMENTE ELEGÍVEL | Match perfeito ou candidato supera os requisitos |

**Regras de honestidade — nunca violar:**
- Tecnologia obrigatória ausente no histórico = gap crítico, sempre
- Não minimize gaps para dar uma nota melhor
- Se pontuação < 3 estrelas → `recomendacao: "NÃO PROSSEGUIR"`
- Se pontuação = 3 estrelas → `recomendacao: "PROSSEGUIR COM ATENÇÃO"`
- Se pontuação ≥ 4 estrelas → `recomendacao: "PROSSEGUIR"`

**Exibir:** `3. Elegibilidade: [X]/5 estrelas — [STATUS]`

---

### ETAPA 4 e 5 — Estratégia do Currículo

**Exibir no início:** `4. Definindo estratégia...`

Execute toda a análise abaixo antes de exibir o resultado:

#### 4.1 Perfil da Vaga (análise interna)
- É startup ou corporação? (impacta tom e formato)
- A vaga valoriza mais: resultados, liderança ou profundidade técnica?
- Qual a urgência de preencher a posição?
- Qual o diferencial competitivo que o candidato tem sobre outros candidatos típicos?

#### 4.2 Escolha da Estratégia Base

Avalie as três opções e escolha a mais adequada:

**Estratégia A — Concisa e Impactante**
- Formato: 1 página
- Experiências: 2-3 mais relevantes
- Bullets: curtos, diretos, com métricas fortes
- Ideal para: candidato 4-5★, vaga que valoriza objetividade, empresas de tecnologia ágeis

**Estratégia B — Detalhada e Narrativa**
- Formato: 1-2 páginas
- Experiências: 3-5, com contexto rico
- Bullets: contam história de evolução e crescimento
- Ideal para: candidato 3★ com gaps a contextualizar, vagas que valorizam trajetória

**Estratégia C — Híbrida e Focada**
- Formato: 1 página densa
- Experiências: top 3, profundidade variável (mais recente = mais detalhada)
- Bullets: mistura de métricas e contexto
- Ideal para: candidato 3-4★, vagas mistas

#### 4.3 Decisões Estratégicas Detalhadas

Defina internamente cada ponto abaixo:

**a) Experiências — Seleção e Ordem**
- Quais experiências INCLUIR? (máx. 5, mín. 2)
- Quais OMITIR? (critérios: muito antigas, irrelevantes para a vaga, evidenciam gaps desnecessários, não agregam valor)
- Ordem: cronológica reversa (padrão) ou por relevância (só se justificado)
- Para cada experiência incluída: quantos bullets (2-6) e qual foco (técnico / liderança / resultados / misto)

**b) Competências Técnicas — Seleção e Ordem**
- DESTACAR: tecnologias que fazem match direto com a vaga
- MENCIONAR: tecnologias complementares relevantes
- OMITIR: tecnologias irrelevantes para esta vaga, tecnologias que podem gerar ruído, tecnologias muito antigas
- Categorias vazias: não incluir no JSON

**c) Resumo Profissional (summary)**
- Incluir ou omitir?
- Se incluir: 2-4 linhas, foco em anos de experiência + especialidade + impacto mais relevante para a vaga

**d) Projetos**
- Incluir seção de projetos?
- Se sim: quais projetos do histórico têm maior relevância para esta vaga?

**e) Formação Acadêmica**

Critérios de INCLUSÃO — incluir apenas se atender ao menos um:
- Graduação ou pós-graduação em área de TI ou correlata (Ciência da Computação, Engenharia de Software, Sistemas de Informação, etc.)
- Curso técnico diretamente relacionado à área da vaga (ex: Técnico em Informática para vaga de desenvolvimento)
- Bootcamp ou curso intensivo reconhecido na área de tecnologia com carga horária relevante (ex: Full Cycle, Alura, Rocketseat formações longas)

Critérios de EXCLUSÃO — omitir sempre que:
- Curso técnico de área completamente diferente da vaga (ex: Técnico em Eletrônica, Técnico em Administração para vagas de TI)
- Formação de ensino médio sem relevância técnica
- Cursos muito antigos (>10 anos) de áreas não relacionadas
- Qualquer formação que não agregue credibilidade para a vaga específica

**Regra prática de formação:** se um recrutador de TI visse essa formação no currículo, ela geraria valor ou ruído? Se ruído → omitir.

**f) Certificações**
- Incluir apenas certificações que reforçam o match com a vaga (ex: AWS para vaga cloud, certificações ágeis para vaga com Scrum)
- Omitir certificações de áreas completamente não relacionadas à vaga
- Omitir certificações muito antigas se a tecnologia evoluiu e não houve renovação

**g) Idiomas**
- Incluir apenas idiomas que têm relevância para a vaga
- Omitir idiomas com nível básico que não agregam

**h) Tratamento de Gaps**
Para cada gap identificado na Etapa 2, decida internamente:
- Usar tecnologia similar/do mesmo ecossistema como ponte
- Contextualizar experiência de forma que minimize o gap
- Omitir menções que evidenciem o gap sem necessidade
- Nunca mentir — apenas enquadrar da melhor forma honesta

#### 4.4 Regras Absolutas de Criação

❌ **NUNCA:**
- Inventar tecnologias que não aparecem no histórico
- Criar experiências profissionais que não existem
- Inventar métricas ou números não mencionados no histórico
- Adicionar certificações inexistentes
- Incluir dados pessoais (nome, email, telefone, endereço) no JSON

✅ **DEVE:**
- Reformular bullets no padrão: **AÇÃO + CONTEXTO + RESULTADO mensurável**
  - ✅ BOM: "Arquitetou sistema de pagamentos processando R$50M/mês, reduzindo latência 60% (200ms→80ms)"
  - ✅ BOM: "Liderou migração monólito→microsserviços, elevando frequência de deploys de 3 para 300/dia"
  - ❌ RUIM: "Trabalhei com Node.js e TypeScript no projeto"
  - ❌ RUIM: "Participei da melhoria de performance"
  - ❌ RUIM: "Ajudei a desenvolver APIs REST"
- Usar métricas reais do histórico — podem ser reformuladas, nunca inventadas
- Omitir experiências, formações e certificações que não agreguem valor para esta vaga

**Exibir:** `5. Estratégia [A/B/C] selecionada — [nome da estratégia]`

---

### ETAPA 6 — Geração do JSON

**Exibir:** `6. Gerando currículo...`

Gere o JSON completo seguindo rigorosamente o schema abaixo.
Aplique todas as decisões estratégicas da Etapa 4 ao montar cada seção.

**Regras do JSON:**
- `titulo_curriculo`: máximo 3-4 palavras, minimalista, descreve o perfil (ex: `"Dev Backend Senior"`, `"Tech Lead Node"`, `"Engenheiro Cloud AWS"`)
- `vaga_alvo.empresa`: nome real e completo da empresa da vaga — obrigatório
- Seções não utilizadas: usar array vazio `[]`, nunca omitir o campo
- Omitir `summary` inteiro se estratégia não incluir resumo profissional
- Omitir categorias de `core_competencies` que ficarem vazias

**Schema completo:**
```json
{
  "versao": "1.0.0",
  "data_geracao": "YYYY-MM-DD",
  "vaga_alvo": {
    "titulo": "Cargo exato da vaga",
    "empresa": "Nome real e completo da empresa",
    "localizacao": "Cidade, Estado"
  },
  "elegibilidade": {
    "pontuacao_estrelas": 4,
    "pontuacao_percentual": 80,
    "status": "ELEGÍVEL",
    "pontos_fortes": [
      "Ponto forte 1 — específico e baseado no histórico",
      "Ponto forte 2"
    ],
    "pontos_fracos": [
      "Gap ou ponto fraco 1 — específico"
    ],
    "gaps_criticos": [],
    "recomendacao": "PROSSEGUIR",
    "sugestoes": [
      "Sugestão prática para aumentar chances ou se preparar para entrevista"
    ]
  },
  "curriculo": {
    "titulo_curriculo": "Dev Backend Senior",
    "meta": {
      "version": "1.0.0",
      "last_updated": "YYYY-MM-DD",
      "language": "pt-BR",
      "target_level": "senior"
    },
    "header": {
      "headline": "Título profissional completo e descritivo para exibição no topo do currículo"
    },
    "summary": "Resumo profissional de 2-4 linhas focado na vaga. Omitir este campo inteiro se estratégia não incluir.",
    "core_competencies": {
      "languages_runtime": ["Node.js", "TypeScript", "Python"],
      "frameworks_libraries": ["Express", "NestJS"],
      "databases": ["PostgreSQL", "Redis", "MongoDB"],
      "cloud_infrastructure": ["AWS", "Docker", "Kubernetes"],
      "messaging_queues": ["RabbitMQ", "Kafka"],
      "testing_quality": ["Jest", "Cypress"],
      "devops_ci_cd": ["GitHub Actions", "Jenkins"],
      "methodologies": ["Scrum", "TDD", "DDD"]
    },
    "experience": [
      {
        "company": "Nome da empresa",
        "role": "Cargo exato",
        "period": {
          "start": "YYYY-MM",
          "end": "current"
        },
        "location": {
          "city": "Cidade",
          "state": "UF",
          "remote": false
        },
        "highlights": [
          "Ação forte + contexto claro + resultado mensurável",
          "Ação forte + contexto claro + resultado mensurável",
          "Ação forte + contexto claro + resultado mensurável"
        ],
        "stack": ["Tech1", "Tech2", "Tech3"]
      }
    ],
    "projects": [
      {
        "name": "Nome do projeto",
        "type": "work",
        "description": "Descrição objetiva de 1-2 linhas",
        "impact": [
          "Impacto mensurável 1",
          "Impacto mensurável 2"
        ],
        "technologies": ["Tech1", "Tech2"]
      }
    ],
    "education": [
      {
        "institution": "Nome da instituição",
        "degree": "Nome do curso",
        "period": {
          "start": "YYYY",
          "end": "YYYY"
        }
      }
    ],
    "certifications": [
      {
        "name": "Nome da certificação",
        "issuer": "Empresa emissora",
        "date": "YYYY-MM"
      }
    ],
    "languages": [
      {
        "language": "Português",
        "proficiency": "nativo"
      },
      {
        "language": "Inglês",
        "proficiency": "fluente"
      }
    ]
  }
}
```

**Valores válidos para `proficiency`:** `nativo` | `fluente` | `avançado` | `intermediário` | `básico`
**Valores válidos para `target_level`:** `junior` | `pleno` | `senior` | `tech-lead` | `staff` | `principal`
**Valores válidos para `recomendacao`:** `NÃO PROSSEGUIR` | `PROSSEGUIR COM ATENÇÃO` | `PROSSEGUIR`
**Valores válidos para `status`:** `NÃO ELEGÍVEL` | `BAIXA ELEGIBILIDADE` | `PARCIALMENTE ELEGÍVEL` | `ELEGÍVEL` | `ALTAMENTE ELEGÍVEL`

---

### ETAPA 7 — Validação Final

**Exibir:** `7. Validando JSON...`

Verifique internamente cada item antes de gerar o output:

- [ ] JSON é sintaticamente válido (sem vírgulas extras, aspas corretas, chaves fechadas)
- [ ] `vaga_alvo.empresa` contém o nome real da empresa (não vazio, não genérico)
- [ ] `vaga_alvo.titulo` contém o cargo real da vaga
- [ ] `curriculo.titulo_curriculo` está preenchido com máximo 4 palavras
- [ ] `curriculo.header.headline` está preenchido
- [ ] Datas em formato `YYYY-MM` para experiências e `YYYY` para educação
- [ ] `elegibilidade` contém todos os campos obrigatórios
- [ ] Nenhum dado pessoal no JSON (nome, email, telefone, CPF, endereço)
- [ ] Nenhuma informação inventada — tudo tem base no histórico
- [ ] Arrays vazios `[]` onde não há conteúdo (nunca `null` ou campo omitido)

Se identificar erro no JSON durante validação: corrija silenciosamente antes de exibir.

---

## OUTPUT FINAL

Após as 7 linhas de progresso, exiba **exatamente** nesta ordem, sem nenhum texto adicional:

```
Concluído.

Cole o conteúdo abaixo na caixa de texto "Colar Resposta do ChatGPT"
(clique em "➡️ Próxima Etapa: Colar Resposta" após fechar este prompt)
e depois clique em "✨ Gerar Currículo":

```json
{ JSON completo aqui }
```
```

**FIM DO PROMPT MASTER**