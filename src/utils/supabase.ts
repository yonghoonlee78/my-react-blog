// utils/supabase.ts - 완전히 새로 교체
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sratlgstalpaiopxto.supabase.co'
console.log('현재 사용중인 Supabase URL:', supabaseUrl)
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyYXRsaWdzdGFpZnBhaW9weHRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0Mjk2NDUsImV4cCI6MjA3MjAwNTY0NX0.Xl_IYVJ-fId39sjGZkvhNwi3HkFAu23aBMjt10kiTto'

export const supabase = createClient(supabaseUrl, supabaseKey)


