# Recall App — Claude Code Context

## Repo structure
- Git root: `/Users/nischit/Learning/app_creation/`
- Next.js project lives in `recall-app/` subdirectory
- Remote: `Nischii/recall-app` on GitHub
- Deployed on Vercel; `vercel.json` at `recall-app/vercel.json` forces Next.js detection

## Tech stack
- Next.js 15 App Router (TypeScript)
- Supabase (Postgres + RLS) for all data
- No auth yet — all RLS policies use `using (true)` / `with check (true)`

## Supabase tables
| Table | Key columns |
|-------|-------------|
| `rooms` | id, name, icon, created_at |
| `members` | id, name, created_at |
| `items` | id, name, room_id, spot, notes, member_id, quantity (int, default 1), expires_at (date), created_at |
| `spots` | id, room_id, name, created_at |

Full schema: `recall-app/supabase-schema.sql`

## Critical patterns

### Next.js 15 route params
Always use `Promise<{id: string}>` — never the old `{params: {id: string}}` pattern:
```ts
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
```

### Supabase `.maybeSingle()` vs `.single()`
Use `.maybeSingle()` for UPDATE/SELECT that might return 0 rows. `.single()` throws if no rows found.

### RLS — every new table needs all 4 policies
When creating a new table, always add RLS policies for SELECT, INSERT, UPDATE, DELETE or the feature will silently fail:
```sql
alter table <table> enable row level security;
create policy "Public read <table>" on <table> for select using (true);
create policy "Public insert <table>" on <table> for insert with check (true);
create policy "Public update <table>" on <table> for update using (true);
create policy "Public delete <table>" on <table> for delete using (true);
```

## Local dev false positives
`node_modules` is not installed locally — IDE shows TypeScript errors like:
- "Cannot find module 'react'"
- "Cannot find module 'next/server'"
- "JSX element implicitly has type 'any'"

These are **not real errors**. The build on Vercel succeeds. Do not try to fix these.

## Features built
- Rooms: create, rename (inline in room header), delete (blocked if room has items)
- Members: create, list
- Items: add, edit (inline), delete — with quantity + expiry date tracking
- Spots (sub-locations): per-room, stored in Supabase `spots` table (NOT localStorage)
- Browse by room or member; search by name (case-insensitive via `.ilike`)
- Expiry badge on items: Expired / Today / X days left / Expires soon (≤7 days)
- AI search tab: disabled (removed from UI)

## API routes
- `GET/POST /api/items` — list (filter by room_id or member_id) / create
- `PATCH/DELETE /api/items/[id]` — edit / delete
- `GET/POST /api/rooms` — list / create
- `PATCH/DELETE /api/rooms/[id]` — rename / delete (409 if items exist)
- `GET/POST /api/members` — list / create
- `GET /api/spots` / `POST /api/spots` — list all / create
- `DELETE /api/spots/[id]` — delete spot

## Pending / future ideas
- Auth (currently open access)
- Item image uploads
- Low stock / expiry push notifications
- Shopping list from low/expired items
- Item history / audit log
