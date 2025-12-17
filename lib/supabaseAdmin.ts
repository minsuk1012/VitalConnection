import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn("Missing Supabase Service Role Key or URL") 
} else {
  console.log("Supabase Admin Client initialized with URL:", supabaseUrl)
  console.log("Service Role Key present (length):", supabaseServiceRoleKey.length)
}

// Note: This client has admin privileges. Use ONLY on the server.
export const supabaseAdmin = createClient(supabaseUrl || '', supabaseServiceRoleKey || '', {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})
