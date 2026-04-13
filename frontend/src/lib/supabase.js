// supabase.js — legacy stub
// Supabase fue migrado a cat-api (Node+Express+PostgreSQL)
// Este archivo existe temporalmente para no romper imports que aún no migraron
// TODO: eliminar cuando MisionesAgente.jsx esté completamente migrado

export const supabase = {
  from: () => ({
    select: () => ({ data: null, error: null }),
    insert: () => ({ data: null, error: null }),
    update: () => ({ eq: () => ({ data: null, error: null }) }),
    eq: () => ({ single: () => ({ data: null, error: null }), data: null, error: null }),
    in: () => ({ data: null, error: null }),
    neq: () => ({ data: null, error: null }),
    order: () => ({ data: null, error: null, limit: () => ({ data: null, error: null }) }),
    single: () => ({ data: null, error: null }),
  }),
  auth: {
    getSession: () => Promise.resolve({ data: { session: null } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword: () => Promise.resolve({ error: { message: 'Supabase migrado' } }),
    signOut: () => Promise.resolve(),
  },
  channel: () => ({
    on: () => ({ subscribe: () => {} }),
    subscribe: () => {},
  }),
  removeChannel: () => {},
  storage: {
    from: () => ({
      upload: () => Promise.resolve({ data: null, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
    }),
  },
}
