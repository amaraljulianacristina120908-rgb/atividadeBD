-- Script SQL de referencia para o Supabase
-- Sistema Integrado de Gestao e Operacoes

-- 1. Tabela de Perfis de Usuarios (Profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT NOT NULL,
    role TEXT DEFAULT 'operador' CHECK (role IN ('administrador', 'gestor', 'operador')),
    department TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Operacoes (Operations)
CREATE TABLE IF NOT EXISTS public.operations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluido', 'cancelado')),
    priority TEXT DEFAULT 'media' CHECK (priority IN ('baixa', 'media', 'alta', 'urgente')),
    location_latitude NUMERIC,
    location_longitude NUMERIC,
    location_address TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Logs Operacionais (Operational Logs)
CREATE TABLE IF NOT EXISTS public.operational_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    operation_id UUID REFERENCES public.operations(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    log_type TEXT DEFAULT 'info' CHECK (log_type IN ('info', 'alerta', 'erro', 'sucesso')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Anexos e Midias (Media Attachments)
CREATE TABLE IF NOT EXISTS public.media_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    operation_id UUID REFERENCES public.operations(id) ON DELETE CASCADE,
    media_type TEXT CHECK (media_type IN ('foto', 'audio', 'documento', 'geolocalizacao')),
    file_path TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_attachments ENABLE ROW LEVEL SECURITY;

-- Politicas de Leitura e Escrita Permissivas para Demonstracao
CREATE POLICY "Permitir leitura publica em perfis" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Permitir leitura publica em operacoes" ON public.operations FOR SELECT USING (true);
CREATE POLICY "Permitir insercao em operacoes" ON public.operations FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualizacao em operacoes" ON public.operations FOR UPDATE USING (true);
CREATE POLICY "Permitir delecao em operacoes" ON public.operations FOR DELETE USING (true);

CREATE POLICY "Permitir leitura publica em logs" ON public.operational_logs FOR SELECT USING (true);
CREATE POLICY "Permitir insercao em logs" ON public.operational_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir leitura publica em midias" ON public.media_attachments FOR SELECT USING (true);
CREATE POLICY "Permitir insercao em midias" ON public.media_attachments FOR INSERT WITH CHECK (true);

-- Function e Trigger para Atualizacao Automatica de updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_operations_updated_at
    BEFORE UPDATE ON public.operations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
