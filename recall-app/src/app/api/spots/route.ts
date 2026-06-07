import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase.from('spots').select('*').order('created_at')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const { name, room_id } = await request.json()
  if (!name || !room_id) return NextResponse.json({ error: 'name and room_id are required' }, { status: 400 })
  const { data, error } = await supabase
    .from('spots')
    .insert({ name, room_id })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
