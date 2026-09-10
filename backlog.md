# Backlog do Projeto - Sistema de Ponto Eletrônico e Gestão de Jornada

Este documento registra todas as funcionalidades implementadas, ajustadas, corrigidas ou alteradas no projeto de forma cronológica.

---

## Registros de Atividades

### [2025-05-15] - Definção Inicial de Arquitetura e Especificação
- **Tipo de Mudança**: `[DOCUMENTAÇÃO]` / `[ARQUITETURA]`
- **Descrição**:
  - Criação do esquema SQL (`schema.sql`) com tabelas (`empresa`, `turnos`, `funcionarios`, `justificativas`, `registros_ponto`), funções de negócio RPC (`cadastrar_justificativa_antifraude`, `registrar_entrada`, `registrar_saida`) e políticas de segurança RLS.
  - Criação da SPEC Principal do Projeto (`SPEC.md`) em sintaxe Markdown direcionada para agentes de IA (Google Jules).
  - Definição da stack tecnológica: HTML/CSS/JS Vanilla, Supabase (API & BD), Lucide Icons (sem emojis), layout limpo para tablet/desktop e integração de bibliotecas auxiliares via CDN.
  - Inclusão das instruções obrigatórias para agentes de IA (consultar em caso de dúvidas, dividir programações em tarefas/subtarefas e manter o `backlog.md`).
- **Arquivos Criados/Modificados**:
  - `schema.sql` (criado)
  - `SPEC.md` (criado)
  - `backlog.md` (criado)
