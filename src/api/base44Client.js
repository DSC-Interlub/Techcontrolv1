import { supabase } from '@/lib/supabase';

// Tabela de mapeamento para mapear nomes de entidades do Base44 para tabelas no Supabase
const tableMap = {
  Avaliacoes: 'avaliacoes',
  Cameras: 'cameras',
  Canetas_Vibracao: 'canetas_vibracao',
  CentrosCusto: 'centros_custo',
  Chamados: 'chamados',
  ChamadosChat: 'chamados_chat',
  Colaboradores: 'colaboradores',
  Coletores: 'coletores',
  Comunicados_Artes: 'comunicados_artes',
  Comunicados_Config: 'comunicados_config',
  Comunicados_Log: 'comunicados_log',
  FilaEmails: 'fila_emails',
  Notebooks_Externos: 'notebooks_externos',
  PCs_Internos: 'pcs_internos',
  Ramais: 'ramais',
  RequisicaoCompras: 'requisicao_compras',
  Reservas: 'reservas',
  ReservasSala: 'reservas_sala',
  Smartphones: 'smartphones',
  Tablets: 'tablets',
  Configuracoes: 'configuracoes',
  User: 'profiles'
};

const createEntityHandler = (entityName) => {
  const tableName = tableMap[entityName] || entityName.toLowerCase();

  return {
    list: async (sort, limit) => {
      let query = supabase.from(tableName).select('*');
      if (sort) {
        const isDesc = sort.startsWith('-');
        const field = isDesc ? sort.substring(1) : sort;
        query = query.order(field, { ascending: !isDesc });
      }
      if (limit) {
        query = query.limit(limit);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    filter: async (criteria, sort) => {
      let query = supabase.from(tableName).select('*');
      if (criteria) {
        for (const [key, value] of Object.entries(criteria)) {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        }
      }
      if (sort) {
        const isDesc = sort.startsWith('-');
        const field = isDesc ? sort.substring(1) : sort;
        query = query.order(field, { ascending: !isDesc });
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    get: async (id) => {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },

    create: async (data) => {
      const isArray = Array.isArray(data);
      let query = supabase.from(tableName).insert(data).select();
      if (!isArray) {
        const { data: inserted, error } = await query.single();
        if (error) throw error;
        return inserted;
      } else {
        const { data: inserted, error } = await query;
        if (error) throw error;
        return inserted;
      }
    },

    update: async (id, data) => {
      const { id: _, created_date: __, ...updateData } = data;
      const { data: updated, error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return updated;
    },

    delete: async (id) => {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    },

    subscribe: (cb) => {
      const channel = supabase
        .channel(`realtime_${tableName}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, (payload) => {
          cb(payload.new);
        })
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }
  };
};

export const base44 = {
  entities: new Proxy({}, {
    get: (target, name) => {
      if (name === 'Query') return null;
      return createEntityHandler(name);
    }
  }),

  auth: {
    me: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        return {
          id: user.id,
          email: user.email,
          role: profile.role,
          name: profile.full_name || profile.nome_exibicao
        };
      }

      const { data: colab } = await supabase
        .from('colaboradores')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (colab) {
        return {
          id: user.id,
          email: user.email,
          role: 'colaborador',
          name: colab.nome_completo
        };
      }

      return {
        id: user.id,
        email: user.email,
        role: 'user'
      };
    },

    logout: async (redirectTo = '/login') => {
      await supabase.auth.signOut();
      sessionStorage.clear();
      window.location.href = redirectTo;
    },

    isAuthenticated: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return !!session;
    },

    redirectToLogin: (redirectTo) => {
      const params = redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : '';
      window.location.href = `/login${params}`;
    }
  },

  users: {
    inviteUser: async (email, role) => {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = {
        'Content-Type': 'application/json'
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch('/api/inviteUser', {
        method: 'POST',
        headers,
        body: JSON.stringify({ email, role })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Erro ao convidar usuário (${res.status})`);
      }
      return await res.json();
    }
  },

  integrations: {
    Core: {
      UploadFile: async ({ file }) => {
        const fileId = typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2) + Date.now();
        const extension = file.name.split('.').pop();
        const filePath = `${fileId}.${extension}`;

        const { error } = await supabase.storage
          .from('uploads')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('uploads')
          .getPublicUrl(filePath);

        return { file_url: publicUrl };
      }
    }
  },

  functions: {
    invoke: async (name, payload) => {
      const { data: { session } } = await supabase.auth.getSession();

      // 1. Caso de listagem de usuários: consulta direta com RLS
      if (name === 'listarUsuarios') {
        const { data, error } = await supabase.from('profiles').select('*');
        if (error) throw error;
        return { data };
      }

      // 2. Caso de geração de demandas: RPC direta no banco
      if (name === 'gerarDemandasComunicados') {
        const { data, error } = await supabase.rpc('gerar_demandas_comunicados', {
          usar_mes_atual: !!payload?.mes_atual
        });
        if (error) throw error;
        return { data };
      }

      // 3. Demais rotas unificadas ou originais
      let targetUrl = `/api/${name}`;
      let bodyData = payload;

      const unifiedNotifications = [
        'sendEmailTicketCreated',
        'sendEmailTicketStarted',
        'sendEmailTicketClosed',
        'sendEmailChatMessage',
        'notificarAprovadorRequisicao',
        'enviarBoasVindas',
        'enviarDespedida'
      ];

      if (unifiedNotifications.includes(name)) {
        targetUrl = '/api/notificar';
        bodyData = { type: name, data: payload };
      } else if (name === 'lembreteAvaliacao') {
        targetUrl = '/api/cronDiario';
        bodyData = { runType: 'avaliacoes' };
      }

      const headers = {
        'Content-Type': 'application/json'
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyData)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Erro de rede (${res.status})`);
      }
      const data = await res.json();
      return { data };
    }
  }
};