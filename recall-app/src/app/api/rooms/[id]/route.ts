import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { count, error: countError } = await supabase
    .from('items')
    .select('id', { count: 'exact', head: true })
    .eq('room_id', id)
  if (countError) return NextResponse.json({ error: countError.message }, { status: 500 })
  if (count && count > 0)
    return NextResponse.json(
      { error: `This room has ${count} item${count > 1 ? 's' : ''} in it. Move or delete them first.` },
      { status: 409 }
    )

  const { error } = await supabase.from('rooms').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { name, icon } = await request.json()
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })
  const { data, error } = await supabase
    .from('rooms')
    .update({ name, ...(icon ? { icon } : {}) })
    .eq('id', id)
    .select()
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Room not found or update not permitted' }, { status: 404 })
  return NextResponse.json(data)
}
