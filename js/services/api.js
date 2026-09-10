// Serviço de API CRUD Genérico utilizando o Cliente Supabase
import { supabase } from '../config/supabase.js';

// Chave para armazenamento local em modo fallback / demonstração
const LOCAL_STORAGE_OPERATIONS_KEY = 'sigo_local_operations';

// Dados iniciais de demonstração
const INITIAL_DEMO_OPERATIONS = [
  {
    id: 'op-101',
    title: 'Inspeção de Infraestrutura de Rede',
    description: 'Verificação periódica dos pontos de acesso no Setor B.',
    status: 'em_andamento',
    priority: 'alta',
    location_address: 'Av. Paulista, 1000 - São Paulo, SP',
    location_latitude: -23.561684,
    location_longitude: -46.655981,
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 'op-102',
    title: 'Manutenção Preventiva de Geradores',
    description: 'Substituição de óleo e testes de carga do gerador auxiliar.',
    status: 'pendente',
    priority: 'urgente',
    location_address: 'Rua das Flores, 45 - Campinas, SP',
    location_latitude: -22.90556,
    location_longitude: -47.06083,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 24).toISOString()
  },
  {
    id: 'op-103',
    title: 'Auditoria de Segurança de Acesso',
    description: 'Validação de permissões de crachás no bloco de controle.',
    status: 'concluido',
    priority: 'media',
    location_address: 'Alameda Santos, 500 - São Paulo, SP',
    location_latitude: -23.56511,
    location_longitude: -46.65211,
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 12).toISOString()
  }
];

function getLocalOperations() {
  const data = localStorage.getItem(LOCAL_STORAGE_OPERATIONS_KEY);
  if (!data) {
    localStorage.setItem(LOCAL_STORAGE_OPERATIONS_KEY, JSON.stringify(INITIAL_DEMO_OPERATIONS));
    return INITIAL_DEMO_OPERATIONS;
  }
  return JSON.parse(data);
}

function saveLocalOperations(items) {
  localStorage.setItem(LOCAL_STORAGE_OPERATIONS_KEY, JSON.stringify(items));
}

/**
 * Busca todos os registros de uma tabela
 */
export async function getItems(tableName = 'operations') {
  try {
    const { data, error } = await supabase.from(tableName).select('*').order('created_at', { ascending: false });
    if (error || !data || data.length === 0) {
      if (tableName === 'operations') {
        return getLocalOperations();
      }
      return [];
    }
    return data;
  } catch (err) {
    console.warn(`Fallback local ativado para tabela ${tableName}:`, err.message);
    if (tableName === 'operations') {
      return getLocalOperations();
    }
    return [];
  }
}

/**
 * Cria um novo registro
 */
export async function createItem(tableName, itemData) {
  try {
    const { data, error } = await supabase.from(tableName).insert([itemData]).select();
    if (error || !data) {
      if (tableName === 'operations') {
        const items = getLocalOperations();
        const newItem = {
          id: 'op-' + Date.now(),
          ...itemData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        items.unshift(newItem);
        saveLocalOperations(items);
        return newItem;
      }
      return itemData;
    }
    return data[0];
  } catch (err) {
    console.warn(`Erro na inserção Supabase (${tableName}), usando armazenamento local.`, err.message);
    if (tableName === 'operations') {
      const items = getLocalOperations();
      const newItem = {
        id: 'op-' + Date.now(),
        ...itemData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      items.unshift(newItem);
      saveLocalOperations(items);
      return newItem;
    }
    return itemData;
  }
}

/**
 * Atualiza um registro existente por ID
 */
export async function updateItem(tableName, id, updates) {
  try {
    const { data, error } = await supabase.from(tableName).update(updates).eq('id', id).select();
    if (error || !data) {
      if (tableName === 'operations') {
        const items = getLocalOperations();
        const index = items.findIndex(item => item.id === id);
        if (index !== -1) {
          items[index] = { ...items[index], ...updates, updated_at: new Date().toISOString() };
          saveLocalOperations(items);
          return items[index];
        }
      }
      return updates;
    }
    return data[0];
  } catch (err) {
    if (tableName === 'operations') {
      const items = getLocalOperations();
      const index = items.findIndex(item => item.id === id);
      if (index !== -1) {
        items[index] = { ...items[index], ...updates, updated_at: new Date().toISOString() };
        saveLocalOperations(items);
        return items[index];
      }
    }
    return updates;
  }
}

/**
 * Deleta um registro por ID
 */
export async function deleteItem(tableName, id) {
  try {
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) {
      if (tableName === 'operations') {
        let items = getLocalOperations();
        items = items.filter(item => item.id !== id);
        saveLocalOperations(items);
        return true;
      }
      return false;
    }
    return true;
  } catch (err) {
    if (tableName === 'operations') {
      let items = getLocalOperations();
      items = items.filter(item => item.id !== id);
      saveLocalOperations(items);
      return true;
    }
    return false;
  }
}
