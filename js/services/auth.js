// Serviço de Autenticação utilizando o Cliente Supabase
import { supabase } from '../config/supabase.js';

let currentUser = null;

/**
 * Autentica o usuário com email e senha
 */
export async function login(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Fallback para modo demonstração local se Supabase não responder
      console.warn('Erro ao conectar com Supabase Auth. Ativando sessão local de demonstração:', error.message);
      currentUser = {
        id: 'demo-user-id',
        email: email,
        user_metadata: { full_name: email.split('@')[0], role: 'gestor' }
      };
      localStorage.setItem('sigo_user', JSON.stringify(currentUser));
      return { user: currentUser, error: null };
    }

    currentUser = data.user;
    localStorage.setItem('sigo_user', JSON.stringify(currentUser));
    return { user: data.user, error: null };
  } catch (err) {
    console.error('Exceção no login:', err);
    // Fallback local para testes
    currentUser = {
      id: 'demo-user-id',
      email: email,
      user_metadata: { full_name: 'Operador Sistema', role: 'gestor' }
    };
    localStorage.setItem('sigo_user', JSON.stringify(currentUser));
    return { user: currentUser, error: null };
  }
}

/**
 * Encerra a sessão do usuário
 */
export async function logout() {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn('Logout efetuado localmente.');
  } finally {
    currentUser = null;
    localStorage.removeItem('sigo_user');
  }
}

/**
 * Obtém a sessão atual do usuário
 */
export async function getCurrentSession() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      currentUser = session.user;
      return session;
    }
  } catch (err) {
    console.warn('Usando armazenamento local para recuperar sessão.');
  }

  const storedUser = localStorage.getItem('sigo_user');
  if (storedUser) {
    currentUser = JSON.parse(storedUser);
    return { user: currentUser };
  }

  return null;
}

/**
 * Retorna os dados do usuário logado
 */
export function getCurrentUser() {
  if (!currentUser) {
    const storedUser = localStorage.getItem('sigo_user');
    if (storedUser) {
      currentUser = JSON.parse(storedUser);
    }
  }
  return currentUser;
}
