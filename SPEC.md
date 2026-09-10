# SPEC Principal do Projeto: Sistema Eletrônico de Ponto e Gestão de Jornada (Antifraude)

---

## 1. Avaliação de Viabilidade do Projeto
- **Grau de Confiança:** **ALTA (100%)**
- **Justificativa:**
  - Toda a lógica pesada de cálculo de ponto, validação de jornada, tolerância a atrasos, cálculo de banco de horas e verificações antifraude por hash SHA-256 e HMAC é encapsulada em Stored Procedures/RPC no banco de dados Supabase (PostgreSQL).
  - A camada de front-end necessita apenas de HTML5, CSS3 puro e JavaScript Vanilla consumindo a API REST/RPC do Supabase (`@supabase/supabase-js`), reduzindo drasticamente a complexidade do código cliente, dependências e taxa de erros.
  - Não são necessários compiladores, pacotes npm ou frameworks complexos de build.

---

## 2. Arquitetura e Stack Tecnológica
- **Agente de IA e Automação:** Google Jules.
- **Hospedagem e Repositório:** GitHub (GitHub Pages / Repositório Git estático).
- **Banco de Dados & backend Serverless:** Supabase (PostgreSQL com `pgcrypto`, RLS e funções RPC).
- **Front-end UI:** HTML5 semântico, CSS3 moderno (Flexbox/Grid), JavaScript Vanilla (ES6+ native).

---

## 3. Bibliotecas Recomendadas (CDN via `<script>`)
Para garantir máxima estabilidade, menor pegada de código e prevenção de falhas no cliente, o uso de CDN externas é restrito às seguintes bibliotecas essenciais:
1. **Supabase Client Library (`@supabase/supabase-js@2`):**
   - *Finalidade:* Abstração para chamadas das funções RPC no PostgreSQL e consultas via REST.
   - *URL:* `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`
2. **Lucide Icons (`lucide`):**
   - *Finalidade:* Iconografia vetorial leve e padronizada (proibido o uso de emojis na interface).
   - *URL:* `https://unpkg.com/lucide@latest`
3. **CryptoJS (`crypto-js`):**
   - *Finalidade:* Cálculo do hash SHA-256 no lado do cliente para pré-processamento de arquivos de atestado/justificativas antes do envio.
   - *URL:* `https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.2.0/crypto-js.min.js`

---

## 4. Diretrizes de Interface e Experiência do Usuário (UI / UX)
- **Design Clean:** Background predominantemente branco (`#FFFFFF` ou `#FAFAFA`), tipografia legível e alto contraste visual.
- **Dispositivos Alvo:** **Exclusivo para Tablets e Desktop** (respostas adaptativas para resoluções de tela a partir de 768px de largura).
- **Sem Emojis:** É estritamente vedada a utilização de emojis em botões, títulos, notificações ou textos. Toda indicação visual deve utilizar ícones SVG da biblioteca Lucide.
- **Uso Restrito de APIs Nativas do JS:** APIs nativas como Câmera, Áudio ou Geolocalização só devem ser acionadas quando estritamente solicitadas por funcionalidade crítica do sistema.

---

## 5. Módulos do Sistema e Fluxos de Navegação

### Módulo A: Terminal de Ponto (Totem / Kiosk)
1. **Identificação rápida:** O funcionário insere sua Matrícula e PIN numérico de 4 a 6 dígitos.
2. **Ações rápidas:**
   - **Registrar Entrada:** Invoca RPC `registrar_entrada(p_matricula, p_pin)`. Retorna status do ponto (`EM_ANDAMENTO`, `EM_ANDAMENTO_ATRASO` ou `ABONADO`).
   - **Registrar Saída:** Invoca RPC `registrar_saida(p_matricula, p_pin)`. Retorna total de horas trabalhadas, saldo de banco de horas e o Hash Único de Verificação Antifraude (HMAC/SHA256).
3. **Feedback Visual:** Exibição clara e temporizada de recibo digital de confirmação de registro de ponto.

### Módulo B: Portal de Atestados e Justificativas Antifraude
1. **Formulário de Envio:** O funcionário informa Matrícula, PIN, Tipo de documento, Código/CRM, Período (Início e Fim) e Motivo, anexando o arquivo do comprovante/atestado.
2. **Geração do Hash Local:** O JS calcula localmente o hash SHA-256 do arquivo anexado via CryptoJS.
3. **Validação Antifraude:** Invoca RPC `cadastrar_justificativa_antifraude`. Se o hash do arquivo já existir no banco de dados, o sistema recusa e exibe alerta de tentativa de fraude. Caso aprovado, abona automaticamente os registros pendentes do período.

---

## 6. Esquema do Banco de Dados SQL (Supabase)
O script SQL completo para provisionamento das tabelas (`empresa`, `turnos`, `funcionarios`, `justificativas`, `registros_ponto`), funções RPC (`cadastrar_justificativa_antifraude`, `registrar_entrada`, `registrar_saida`) e políticas de Row Level Security (RLS) encontra-se no arquivo separado **`schema.sql`** na raiz do repositório.

---

## 7. Instruções Fundamentais para Agentes de IA
Qualquer Agente de IA (incluindo Google Jules e assistentes parceiros) executando tarefas neste repositório deve seguir rigidamente as seguintes regras:

1. **Não codifique se houver dúvidas:** Se houver qualquer ambiguidade nos requisitos ou na modelagem, interrompa o trabalho, formule perguntas claras e solicite instrução ao usuário.
2. **Decomposição em Tarefas e Subtarefas:** Sempre divida programações extensas ou refatorações em sub-etapas incrementais, executando e testando cada uma sequencialmente.
3. **Manutenção Obrigatória de `backlog.md`:** Sempre gere ou atualize um arquivo denominado `backlog.md` na raiz do projeto, registrando cronologicamente todas as funcionalidades implementadas, ajustadas ou alteradas.
