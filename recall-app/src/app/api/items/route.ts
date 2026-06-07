import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const roomId = searchParams.get('room_id')
  const memberId = searchParams.get('member_id')

  let query = supabase
    .from('items')
    .select('*, rooms(id,name,icon), members(id,name)')
    .order('created_at', { ascending: false })

  if (roomId) query = query.eq('room_id', roomId)
  if (memberId) query = query.eq('member_id', memberId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { name, room_id, spot, notes, member_id, quantity, expires_at } = body

  if (!name || !room_id) {
    return NextResponse.json({ error: 'name and room_id are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('items')
    .insert({
      name, room_id,
      spot: spot || null,
      notes: notes || null,
      member_id: member_id || null,
      quantity: quantity ? Number(quantity) : 1,
      expires_at: expires_at || null,
    })
    .select('*, rooms(id,name,icon), members(id,name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
