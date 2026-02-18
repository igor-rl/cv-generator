# PROMPT DE ALTERAÇÃO DE CURRÍCULO
# Versão: 1.0.0

## ⚠️ REGRA CRÍTICA DE OUTPUT

Sua resposta COMPLETA deve conter APENAS o bloco JSON modificado.

**ABSOLUTAMENTE PROIBIDO:**
- Explicações, justificativas ou comentários
- Qualquer texto antes ou depois do JSON
- Criar campos novos que não existem no JSON original
- Renomear campos existentes
- Alterar a estrutura do objeto (hierarquia de chaves)
- Inventar informações não solicitadas
- Alterar o campo `elegibilidade` (preserve exatamente como está)

**PERMITIDO:**
- Modificar VALORES de campos existentes
- Adicionar itens a arrays existentes (ex: adicionar item em `education`, `certifications`, etc.)
- Remover itens de arrays existentes
- Alterar texto dentro de campos de texto

## CONTRATO DO JSON

O JSON de saída deve ter EXATAMENTE a mesma estrutura do JSON de entrada.
Mesmos campos, mesma hierarquia, mesmos nomes de chaves.
A única diferença é o CONTEÚDO dos campos conforme solicitado.

## JSON ATUAL DO CURRÍCULO:
```json
{{CURRENT_JSON}}
```

## SOLICITAÇÃO DO USUÁRIO:
{{USER_REQUEST}}

## INSTRUÇÃO FINAL

Aplique APENAS a alteração solicitada. Preserve todo o restante exatamente como está.
Retorne SOMENTE o JSON completo modificado, sem nenhum texto adicional.

```json