# SPEC Principal do Projeto: Sistema de Ponto Eletrônico e Gestão de Jornada (Antifraude)

## 1. Visão Geral e Análise de Viabilidade
- **Status de Viabilidade**: **ALTA CONFIANÇA**.
- **Resumo Executivo**: O sistema consiste em uma solução web para registro de ponto eletrônico, apuração de banco de horas e gestão antifraude de justificativas/atestados médicos. O modelo de dados e procedimentos de negócio armazenados no PostgreSQL via Supabase suprem integralmente os requisitos de integridade, cálculo de tolerância, banco de horas e validação de duplicidade de anexos via hash SHA256.
- **Público-Alvo e Dispositivos**: Tablets e Desktops localizados na empresa ou utilizados por colaboradores.

---

## 2. Stack Tecnológica
- **Agente de IA Executor**: Google Jules.
- **Hospedagem e Repositório**: GitHub.
- **Banco de Dados & API backend**: Supabase (PostgreSQL com Row Level Security e funções RPC).
- **Frontend**: HTML5, CSS3 e JavaScript Vanilla (ES6+), sem dependências de compilação ou bundlers (sem Node/npm/React/Vue/Webpack).
- **Bibliotecas Auxiliares (via CDN)**:
  - `@supabase/supabase-js`: Cliente oficial para integração direta e segura com o Supabase via JS.
  - `Lucide Icons` (ou `FontAwesome` via CDN): Biblioteca visual para substituição total de emojis por ícones vetoriais padronizados.
  - `Crypto-JS` (ou API nativa `crypto.subtle`): Cálculo local de hash SHA256 dos arquivos de atestado para validação antifraude antes do envio.

---

## 3. Diretrizes de Interface (UI / UX)
- **Design System & Layout**:
  - Interface limpa (*clean*), minimalista, com fundo predominantemente branco (`#FFFFFF` / `#F8FAFC`).
  - Layout responsivo otimizado exclusivamente para telas de **Tablet** (mínimo 768px de largura) e **Desktop** (1024px+).
  - Tipografia moderna e legível (`Inter`, `System-UI` ou `Roboto`).
- **Uso de Ícones e Elementos Visuais**:
  - **Proibido o uso de emojis** na interface do usuário.
  - Utilização obrigatória da biblioteca de ícones vetoriais (Lucide Icons) em botões, alertas e cards.
- **Uso de APIs Nativas do JavaScript**:
  - Utilizadas somente quando estritamente necessárias para a operação:
    - `navigator.mediaDevices.getUserMedia`: Acesso à câmera do tablet/desktop para registro de foto no ponto (se habilitado) ou captura rápida de atestado.
    - `FileReader` & `crypto.subtle`: Leitura e hashing local de arquivos de atestado médico.
    - `navigator.geolocation`: Registro opcional de coordenadas geográficas no momento da marcação.

---

## 4. Arquitetura do Sistema e Modelo de Dados
O esquema do banco de dados está definido no arquivo `schema.sql` e inclui as seguintes estruturas:

### 4.1. Tabelas
1. `empresa`: Cadastro dos dados institucionais (Nome, CNPJ).
2. `turnos`: Configuração dos horários previstos, tolerância (em minutos) e carga diária.
3. `funcionarios`: Cadastro de colaboradores, vínculos a turnos, matrícula, CPF e PIN numérico criptografado (SHA256).
4. `justificativas`: Registro antifraude de atestados e licenças, com validação de `hash_arquivo_sha256` único para prevenção de falsificação/duplicidade.
5. `registros_ponto`: Histórico das marcações de entrada, saída, cálculo de saldo do banco de horas, status e hash HMAC/SHA256 de verificação.

### 4.2. Procedimentos Armazenados (RPC)
- `registrar_entrada(p_matricula, p_pin)`: Executa a validação de credenciais, checa duplicidade de entrada aberta, calcula tolerância/atraso e verifica existência de atestado vigente abonado.
- `registrar_saida(p_matricula, p_pin)`: Fecha a jornada em aberto, calcula o total de horas trabalhadas e saldo do banco de horas (positivo/negativo), e gera o hash HMAC/SHA256 único de verificação (composto pelos primeiros 12 caracteres hexadecimais).
- `cadastrar_justificativa_antifraude(p_matricula, p_pin, p_tipo, p_codigo_digital, p_hash_arquivo, p_data_inicio, p_data_fim, p_motivo)`: Valida credenciais, checa duplicidade global do hash do arquivo, insere a justificativa e abona automaticamente os pontos pendentes dentro da vigência.

---

## 5. Módulos e Telas do Frontend

### Módulo 1: Quiosque de Marcação de Ponto (`index.html` / Tablet & Desktop)
- Relógio digital em tempo real com data e hora atualizada por segundo.
- Teclado numérico virtual interativo para digitação rápida da Matrícula e PIN.
- Botões de ação direta: **Registrar Entrada** e **Registrar Saída**.
- Modal de confirmação visual exibindo status (Sucesso, Atraso, Abonado) e o Hash de Verificação gerado (na saída).

### Módulo 2: Portal do Colaborador & Envio Antifraude (`atestados.html`)
- Formulário para envio de atestados e justificativas.
- Leitura do arquivo do atestado (PDF/Imagem), geração automática do Hash SHA256 no browser via JS e transmissão para a RPC `cadastrar_justificativa_antifraude`.
- Feedback visual imediato caso o arquivo já tenha sido utilizado anteriormente no sistema.

### Módulo 3: Painel de Consulta e Espelho de Ponto (`espelho.html`)
- Tabela limpa de registros por período/mês.
- Destaque para saldo diário de banco de horas (+ / -) e indicação de registros abonados.
- Exibição dos hashes de verificação HMAC de cada marcação concluída.

---

## 6. Instruções Específicas para Agentes de IA (Google Jules)
1. **Não codifique se houver dúvidas**: Caso ocorram ambiguidades ou indefinições nos requisitos de interface ou integrações, pare a execução, elabore os questionamentos específicos e consulte o usuário ou a documentação antes de realizar alterações no código.
2. **Divisão em Tarefas e Subtarefas**: Sempre divida tarefas extensas em etapas incrementais pequenas e verificáveis. Não modifique múltiplos componentes sem testes e confirmação prévia de cada etapa.
3. **Registro Obrigatório em `backlog.md`**:
   - Todo e qualquer recurso implementado, ajustado, corrigido ou removido **deve obrigatoriamente** ser registrado em um arquivo `backlog.md` na raiz do repositório.
   - O formato do `backlog.md` deve seguir a estrutura:
     - Data/Hora
     - Tipo de Mudança (`[NOVA FEATURE]`, `[CORREÇÃO]`, `[REFATORAÇÃO]`, `[DOCUMENTAÇÃO]`)
     - Descrição detalhada da alteração
     - Arquivos modificados/criados.
