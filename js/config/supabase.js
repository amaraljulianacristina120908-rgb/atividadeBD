// Configuração e Inicialização do Cliente Supabase via CDN ESM
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Configurações do Supabase
const SUPABASE_URL = window.ENV_SUPABASE_URL || 'https://demo.supabase.co';
const SUPABASE_ANON_KEY = window.ENV_SUPABASE_ANON_KEY || 'demo-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

export const isConfigured = () => {
  return Boolean(window.ENV_SUPABASE_URL && window.ENV_SUPABASE_ANON_KEY);
};
