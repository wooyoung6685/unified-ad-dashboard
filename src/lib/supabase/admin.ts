import { createClient } from '@supabase/supabase-js'

// service role key를 사용하는 admin 클라이언트 (서버 전용)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)
