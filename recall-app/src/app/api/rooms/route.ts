import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase.from('rooms').select('*').order('created_at')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const { name, icon } = await request.json()
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
  const { data, error } = await supabase
    .from('rooms')
    .insert({ name, icon: icon || 'home' })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
