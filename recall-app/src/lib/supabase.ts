import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export type Room = {
  id: string
  name: string
  icon: string
  created_at: string
}

export type Member = {
  id: string
  name: string
  created_at: string
}

export type Item = {
  id: string
  name: string
  room_id: string
  spot: string | null
  notes: string | null
  member_id: string | null
  created_at: string
  rooms?: Room
  members?: Member
}
