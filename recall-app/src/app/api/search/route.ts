import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: Request) {
  const { query } = await request.json()
  if (!query) return NextResponse.json({ error: 'query is required' }, { status: 400 })

  const { data: items } = await supabase
    .from('items')
    .select('*, rooms(name), members(name)')
    .order('created_at', { ascending: false })

  const itemList = (items || []).map((it: any) => ({
    id: it.id,
    name: it.name,
    room: it.rooms?.name,
    spot: it.spot,
    notes: it.notes,
    added_by: it.members?.name,
  }))

  const systemPrompt = `You are Recall, a home item finder assistant. Given a list of items stored in a house and a user's natural language query, return the most relevant matches.

Current inventory:
${JSON.stringify(itemList, null, 2)}

The user may ask questions like:
- "where did dad put the drill?"
- "find something for fixing things"
- "what's in the garage?"
- "blue toolbox"

Return a JSON object with:
{
  "answer": "A short friendly sentence describing where the item(s) are",
  "matched_ids": ["id1", "id2"]
}

Only return valid JSON, nothing else.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    messages: [{ role: 'user', content: query }],
    system: systemPrompt,
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : '{}'
  let parsed: { answer: string; matched_ids: string[] }
  try {
    parsed = JSON.parse(text)
  } catch {
    parsed = { answer: 'I found some possible matches below.', matched_ids: [] }
  }

  const matched = (items || []).filter((it: any) => parsed.matched_ids.includes(it.id))

  return NextResponse.json({ answer: parsed.answer, items: matched })
}
