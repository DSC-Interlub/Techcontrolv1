/**
 * Shim de compatibilidade Base44 → Supabase
 * Mantém a API surface idêntica para que nenhuma página precise ser alterada.
 */
import { supabase } from '@/lib/supabase';

// Mapeamento explícito de nomes de entidade → tabela Supabase
const TABLE_MAP = {
  Colaboradores: 'colaboradores',
  Chamados: 'chamados',
  ChamadosChat: 'chamados_chat',
  ReservasSala: 'reservas_sala',
  Reservas: 'reservas',
  PCs_Internos: 'pcs_internos',
  Notebooks_Externos: 'notebooks_externos',
  Tablets: 'tablets',
  Smartphones: 'smartphones',
  Cameras: 'cameras',
  Coletores: 'coletores',
  Canetas_Vibracao: 'canetas_vibracao',
  Avaliacoes: 'avaliacoes',
  Ramais: 'ramais',
  FilaEmails: 'fila_emails',
  Comunicados_Artes: 'comunicados_artes',
  Comunicados_Log: 'comunicados_log',
  Comunicados_Config: 'comunicados_config',
  // User mapeia para profiles (usuários admin)
  User: 'profiles',
};

function getTable(entityName) {
  return TABLE_MAP[entityName] || entityName.toLowerCase();
}

function createEntity(entityName) {
  const table = getTable(entityName);

  return {
    async list(orderBy, limit) {
      let query = supabase.from(table).select('*');

      if (orderBy) {
        const descending = orderBy.startsWith('-');
        const column = descending ? orderBy.slice(1) : orderBy;
        query = query.order(column, { ascending: !descending });
      } else {
        query = query.order('created_date', { ascending: false });
      }

      if (limit) query = query.limit(limit);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async filter(filters) {
      let query = supabase.from(table).select('*');

      for (const [key, value] of Object.entries(filters || {})) {
        if (value === null || value === undefined) {
          query = query.is(key, null);
        } else if (Array.isArray(value)) {
          query = query.in(key, value);
        } else {
          query = query.eq(key, value);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async get(id) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },

    async create(payload) {
      const { data, error } = await supabase
        .from(table)
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(id, payload) {
      const { data, error } = await supabase
        .from(table)
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async delete(id) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { success: true };
    },

    async bulkCreate(items) {
      const { data, error } = await supabase
        .from(table)
        .insert(items)
        .select();
      if (error) throw error;
      return data || [];
    },
  };
}

// Proxy dinâmico para base44.entities.NomeDaEntidade
const entitiesProxy = new Proxy({}, {
  get(_, entityName) {
    return createEntity(entityName);
  },
});

// Auth
const auth = {
  async me() {
    // getUser() valida o JWT no servidor sem usar locks de localStorage
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw { status: 401, message: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return { ...user, ...profile };
  },

  async logout() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  },

  redirectToLogin() {
    window.location.href = '/login';
  },

  async isAuthenticated() {
    const { data: { user } } = await supabase.auth.getUser();
    return !!user;
  },

  async updateMe(payload) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', user.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },
};

// Integrations (UploadFile e InvokeLLM)
const integrations = {
  Core: {
    async UploadFile({ file }) {
      const ext = file.name.split('.').pop();
      const path = `public/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;

      const { error } = await supabase.storage.from('uploads').upload(path, file);
      if (error) throw error;

      const { data } = supabase.storage.from('uploads').getPublicUrl(path);
      return { file_url: data.publicUrl };
    },

    async InvokeLLM({ prompt, response_json_schema, max_tokens }) {
      const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: {} }));
      const token = session?.access_token || '';

      const res = await fetch('/api/invokeLLM', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt, response_json_schema, max_tokens }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'InvokeLLM failed');
      return result;
    },

    async SendEmail() {
      throw new Error('SendEmail não disponível no frontend — use API Route');
    },
  },
};

// Functions invoke → Vercel API Routes
const functions = {
  async invoke(functionName, payload = {}) {
    const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: {} }));
    const token = session?.access_token || '';

    // Portal: passa o ID do colaborador se existir em sessionStorage
    const portalId = sessionStorage.getItem('portal_colaborador_id') || '';

    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (portalId) headers['x-portal-colaborador-id'] = portalId;

    const res = await fetch(`/api/${functionName}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return { data };
  },
};

export const base44 = {
  entities: entitiesProxy,
  auth,
  integrations,
  functions,
};
