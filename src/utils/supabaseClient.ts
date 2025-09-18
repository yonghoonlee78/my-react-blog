import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ijkbovbtkdxqlcdglgpo.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlqa2JvdmJ0a2R4cWxjZGdsZ3BvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MDI2OTEsImV4cCI6MjA3Mjk3ODY5MX0.KmUT7QGBW9UK3U88KgCfkcZt7yB5EV7EOcykjjutj78'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)