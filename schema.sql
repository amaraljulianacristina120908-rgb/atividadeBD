-- ==============================================================================
-- 1. EXTENSÕES DO POSTGRESQL
-- Necessário para funções criptográficas de segurança e hashing
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==============================================================================
-- 2. TABELAS DO SISTEMA
-- ==============================================================================

-- Tabela de Dados da Empresa
CREATE TABLE IF NOT EXISTS empresa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(150) NOT NULL,
    cnpj VARCHAR(18) UNIQUE NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Turnos e Jornada de Trabalho (Tolerância e Carga Horária)
CREATE TABLE IF NOT EXISTS turnos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(50) NOT NULL, -- Ex: 'Comercial 8h'
    entrada_prevista TIME NOT NULL, -- Ex: 08:00:00
    saida_prevista TIME NOT NULL,   -- Ex: 17:00:00
    tolerancia_minutos INT DEFAULT 10, -- Tolerância para atraso/saída (em minutos)
    carga_diaria_interval INTERVAL DEFAULT '8 hours',
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Funcionários
CREATE TABLE IF NOT EXISTS funcionarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    turno_id UUID REFERENCES turnos(id),
    matricula VARCHAR(20) UNIQUE NOT NULL,
    nome VARCHAR(100) NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    pin_hash VARCHAR(255) NOT NULL, -- PIN numérico criptografado (SHA256)
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Atestados e Justificativas (Antifraude Completo)
CREATE TABLE IF NOT EXISTS justificativas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funcionario_id UUID REFERENCES funcionarios(id) ON DELETE RESTRICT,
    tipo VARCHAR(50) NOT NULL, -- 'ATESTADO_MEDICO', 'LICENCA', 'FOLGA'
    codigo_verificacao_digital VARCHAR(100), -- Código/CRM do atestado
    hash_arquivo_sha256 VARCHAR(64) UNIQUE NOT NULL, -- Antifraude: impede envio do mesmo arquivo
    data_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    data_fim TIMESTAMP WITH TIME ZONE NOT NULL,
    motivo TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_datas_validas CHECK (data_fim > data_inicio)
);

-- Tabela de Registros de Ponto
CREATE TABLE IF NOT EXISTS registros_ponto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funcionario_id UUID REFERENCES funcionarios(id) ON DELETE RESTRICT,
    justificativa_id UUID REFERENCES justificativas(id) ON DELETE SET NULL,
    entrada TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    saida TIMESTAMP WITH TIME ZONE,
    horas_trabalhadas INTERVAL,
    saldo_banco_horas INTERVAL DEFAULT '0 hours', -- Saldo positivo ou negativo do dia
    hash_verificacao TEXT,
    status VARCHAR(30) DEFAULT 'EM_ANDAMENTO', -- 'EM_ANDAMENTO', 'CONCLUIDO', 'EM_ANDAMENTO_ATRASO', 'ABONADO'
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- 3. FUNÇÕES E REGRAS DE NEGÓCIO (RPC)
-- ==============================================================================

-- FUNÇÃO 1: Envio e Validação Antifraude de Atestados / Justificativas
CREATE OR REPLACE FUNCTION cadastrar_justificativa_antifraude(
    p_matricula VARCHAR,
    p_pin VARCHAR,
    p_tipo VARCHAR,
    p_codigo_digital VARCHAR,
    p_hash_arquivo VARCHAR,
    p_data_inicio TIMESTAMP WITH TIME ZONE,
    p_data_fim TIMESTAMP WITH TIME ZONE,
    p_motivo TEXT
)
RETURNS JSON AS $$
DECLARE
    v_funcionario_id UUID;
    v_justificativa_id UUID;
BEGIN
    -- 1. Autenticação do Funcionário
    SELECT id INTO v_funcionario_id
    FROM funcionarios
    WHERE matricula = p_matricula
      AND pin_hash = encode(digest(p_pin, 'sha256'), 'hex')
      AND ativo = TRUE;

    IF v_funcionario_id IS NULL THEN
        RETURN json_build_object('sucesso', false, 'mensagem', 'Matrícula ou PIN incorretos.');
    END IF;

    -- 2. Antifraude: Checa se o arquivo/atestado já foi usado anteriormente no sistema
    IF EXISTS (SELECT 1 FROM justificativas WHERE hash_arquivo_sha256 = p_hash_arquivo) THEN
        RETURN json_build_object('sucesso', false, 'mensagem', 'FRAUDE DETECTADA: Este atestado/documento já foi cadastrado anteriormente.');
    END IF;

    -- 3. Insere a justificativa aprovada automaticamente
    INSERT INTO justificativas (
        funcionario_id, tipo, codigo_verificacao_digital,
        hash_arquivo_sha256, data_inicio, data_fim, motivo
    ) VALUES (
        v_funcionario_id, p_tipo, p_codigo_digital,
        p_hash_arquivo, p_data_inicio, p_data_fim, p_motivo
    ) RETURNING id INTO v_justificativa_id;

    -- 4. Abona automaticamente registros pendentes dentro da vigência do atestado
    UPDATE registros_ponto
    SET status = 'ABONADO', justificativa_id = v_justificativa_id
    WHERE funcionario_id = v_funcionario_id
      AND entrada BETWEEN p_data_inicio AND p_data_fim;

    RETURN json_build_object(
        'sucesso', true,
        'mensagem', 'Atestado/Justificativa validado e cadastrado com sucesso!',
        'justificativa_id', v_justificativa_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- FUNÇÃO 2: Registro de Entrada (Com Checagem de Tolerância e Atestado Vigente)
CREATE OR REPLACE FUNCTION registrar_entrada(
    p_matricula VARCHAR,
    p_pin VARCHAR
)
RETURNS JSON AS $$
DECLARE
    v_funcionario_id UUID;
    v_turno_id UUID;
    v_registro_id UUID;
    v_justificativa_id UUID;
    v_agora TIMESTAMP WITH TIME ZONE := NOW();
    v_entrada_prevista TIME;
    v_tolerancia INT;
    v_status VARCHAR(30) := 'EM_ANDAMENTO';
BEGIN
    -- Autenticação
    SELECT id, turno_id INTO v_funcionario_id, v_turno_id
    FROM funcionarios
    WHERE matricula = p_matricula
      AND pin_hash = encode(digest(p_pin, 'sha256'), 'hex')
      AND ativo = TRUE;

    IF v_funcionario_id IS NULL THEN
        RETURN json_build_object('sucesso', false, 'mensagem', 'Matrícula ou PIN incorretos.');
    END IF;

    -- Validação: impede múltiplos pontos de entrada sem saída
    IF EXISTS (
        SELECT 1 FROM registros_ponto
        WHERE funcionario_id = v_funcionario_id AND status LIKE 'EM_ANDAMENTO%'
    ) THEN
        RETURN json_build_object('sucesso', false, 'mensagem', 'Já existe um registro de entrada em aberto.');
    END IF;

    -- Checa se existe atestado ativo cobrindo o horário atual
    SELECT id INTO v_justificativa_id
    FROM justificativas
    WHERE funcionario_id = v_funcionario_id
      AND v_agora BETWEEN data_inicio AND data_fim
      AND ativo = TRUE
    LIMIT 1;

    -- Verifica se o horário de entrada é um atraso (considerando a tolerância)
    IF v_turno_id IS NOT NULL AND v_justificativa_id IS NULL THEN
        SELECT entrada_prevista, tolerancia_minutos INTO v_entrada_prevista, v_tolerancia FROM turnos WHERE id = v_turno_id;

        IF (v_agora::TIME > (v_entrada_prevista + (v_tolerancia || ' minutes')::INTERVAL)) THEN
            v_status := 'EM_ANDAMENTO_ATRASO';
        END IF;
    ELSIF v_justificativa_id IS NOT NULL THEN
        v_status := 'ABONADO';
    END IF;

    -- Insere o registro de entrada
    INSERT INTO registros_ponto (funcionario_id, justificativa_id, entrada, status)
    VALUES (v_funcionario_id, v_justificativa_id, v_agora, v_status)
    RETURNING id INTO v_registro_id;

    RETURN json_build_object(
        'sucesso', true,
        'mensagem', 'Entrada registrada com sucesso!',
        'status', v_status,
        'registro_id', v_registro_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- FUNÇÃO 3: Registro de Saída, Banco de Horas e Hash HMAC/SHA256
CREATE OR REPLACE FUNCTION registrar_saida(
    p_matricula VARCHAR,
    p_pin VARCHAR
)
RETURNS JSON AS $$
DECLARE
    v_funcionario_id UUID;
    v_turno_id UUID;
    v_registro_id UUID;
    v_entrada TIMESTAMP WITH TIME ZONE;
    v_saida TIMESTAMP WITH TIME ZONE := NOW();
    v_horas INTERVAL;
    v_carga_prevista INTERVAL := '8 hours';
    v_saldo_banco INTERVAL;
    v_hash TEXT;
    v_status_final VARCHAR(30) := 'CONCLUIDO';
BEGIN
    -- Autenticação
    SELECT id, turno_id INTO v_funcionario_id, v_turno_id
    FROM funcionarios
    WHERE matricula = p_matricula
      AND pin_hash = encode(digest(p_pin, 'sha256'), 'hex')
      AND ativo = TRUE;

    IF v_funcionario_id IS NULL THEN
        RETURN json_build_object('sucesso', false, 'mensagem', 'Matrícula ou PIN incorretos.');
    END IF;

    -- Localiza o registro aberto
    SELECT id, entrada INTO v_registro_id, v_entrada
    FROM registros_ponto
    WHERE funcionario_id = v_funcionario_id AND status LIKE 'EM_ANDAMENTO%'
    ORDER BY entrada DESC LIMIT 1;

    IF v_registro_id IS NULL THEN
        RETURN json_build_object('sucesso', false, 'mensagem', 'Nenhum ponto de entrada em aberto encontrado.');
    END IF;

    -- Carga Horária e Cálculo de Banco de Horas
    IF v_turno_id IS NOT NULL THEN
        SELECT carga_diaria_interval INTO v_carga_prevista FROM turnos WHERE id = v_turno_id;
    END IF;

    v_horas := v_saida - v_entrada;
    v_saldo_banco := v_horas - v_carga_prevista; -- Saldo positivo (hora extra) ou negativo (horas devidas)

    -- Geração do Hash HMAC/SHA256 Único Antifraude
    v_hash := encode(
        hmac(
            v_registro_id::text || v_funcionario_id::text || v_saida::text,
            'CHAVE_SECRETA_SISTEMA_PONTO',
            'sha256'
        ),
        'hex'
    );

    -- Atualização final do Ponto
    UPDATE registros_ponto
    SET
        saida = v_saida,
        horas_trabalhadas = v_horas,
        saldo_banco_horas = v_saldo_banco,
        hash_verificacao = UPPER(SUBSTRING(v_hash FROM 1 FOR 12)),
        status = v_status_final
    WHERE id = v_registro_id;

    RETURN json_build_object(
        'sucesso', true,
        'mensagem', 'Saída registrada com sucesso!',
        'hash_verificacao', UPPER(SUBSTRING(v_hash FROM 1 FOR 12)),
        'horas_trabalhadas', v_horas::text,
        'saldo_banco_horas', v_saldo_banco::text
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 4. SEGURANÇA (ROW LEVEL SECURITY - RLS)
-- ==============================================================================
ALTER TABLE empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE justificativas ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_ponto ENABLE ROW LEVEL SECURITY;

-- Apaga políticas antigas para evitar conflitos ao reexecutar o script
DROP POLICY IF EXISTS "Leitura Publica Empresa" ON empresa;
DROP POLICY IF EXISTS "Leitura Publica Turnos" ON turnos;
DROP POLICY IF EXISTS "Leitura Funcionarios Ativos" ON funcionarios;
DROP POLICY IF EXISTS "Gestão Justificativas" ON justificativas;
DROP POLICY IF EXISTS "Gestão Registros Ponto" ON registros_ponto;

-- Criação das Políticas
CREATE POLICY "Leitura Publica Empresa" ON empresa FOR SELECT USING (true);
CREATE POLICY "Leitura Publica Turnos" ON turnos FOR SELECT USING (true);
CREATE POLICY "Leitura Funcionarios Ativos" ON funcionarios FOR SELECT USING (ativo = true);
CREATE POLICY "Gestão Justificativas" ON justificativas FOR ALL USING (true);
CREATE POLICY "Gestão Registros Ponto" ON registros_ponto FOR ALL USING (true);
