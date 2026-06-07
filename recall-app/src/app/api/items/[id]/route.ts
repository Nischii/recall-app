import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { name, room_id, spot, notes, member_id } = await request.json()
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
  const { data, error } = await supabase
    .from('items')
    .update({ name, room_id, spot: spot || null, notes: notes || null, member_id: member_id || null })
    .eq('id', id)
    .select('*, rooms(*), members(*)')
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Item not found or update not permitted' }, { status: 404 })
  return NextResponse.json(data)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error } = await supabase.from('items').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
