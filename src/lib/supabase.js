const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
// Accept either the service role key (preferred for backends with RLS) or anon key
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase credentials. Set SUPABASE_URL and either SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY in .env'
  );
}

if (!process.env.SUPABASE_SERVICE_KEY && process.env.SUPABASE_ANON_KEY) {
  console.warn(
    '[supabase] Using SUPABASE_ANON_KEY — Row Level Security policies will apply. ' +
    'Set SUPABASE_SERVICE_KEY for full backend access.'
  );
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

module.exports = supabase;
