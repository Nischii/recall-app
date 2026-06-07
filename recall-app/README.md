# Recall — Find anything at home

Track where you keep everything in your house. Never lose an item again.
Built with Next.js 15 and Supabase.

---

## Features

### Rooms
- Create rooms with an icon (Kitchen, Garage, Bedroom, etc.)
- Rename rooms inline directly from the room header
- Delete rooms — blocked if the room still has items

### Items
- Add items with: name, room, spot (sub-location), who added it, notes
- Edit items inline — all fields editable without leaving the page
- Delete items
- **Quantity tracking** — track how many of an item you have
- **Expiry date tracking** — see expiry badges: Expired / Today / X days left / Expires soon (≤7 days)

### Spots (sub-locations)
- Add named spots within each room (e.g. "Top shelf", "Under sink")
- Spots are stored in Supabase — shared across all devices
- Delete spots per room

### Members
- Add family members
- Filter all items by member ("Show only Dad's items")
- "Added by" defaults to the selected member when adding items

### Browse & Search
- Browse items by room or by member
- Case-insensitive search across all item names
- Room selection auto-fills the room field when adding a new item

---

## Tech stack

- **Next.js 15** App Router (TypeScript)
- **Supabase** — Postgres database with Row Level Security
- **Vercel** — hosting and deployment

---

## Deploy in 3 steps

### Step 1 — Set up Supabase

1. Go to [supabase.com](https://supabase.com) and sign up free
2. Click **New project**, give it a name (e.g. "recall"), choose a region
3. Go to **SQL Editor** in the left sidebar
4. Paste the contents of `supabase-schema.sql` and click **Run**
5. Go to **Settings → API** and copy:
   - **Project URL** (looks like `https://abc123.supabase.co`)
   - **anon / public key** (long string starting with `eyJ...`)

### Step 2 — Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → Import your repo
3. Set **Framework Preset** to **Next.js**
4. Add these **Environment Variables**:
   ```
   NEXT_PUBLIC_SUPABASE_URL       = https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY  = eyJ...your-anon-key...
   ```
5. Click **Deploy**

### Step 3 — Use it

Open your live URL. Browse rooms, add items, search, filter by family member.

---

## Local development

```bash
npm install
cp .env.local.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
# Open http://localhost:3000
```

---

## Project structure

```
recall-app/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── items/route.ts        # GET + POST items
│   │   │   ├── items/[id]/route.ts   # PATCH + DELETE item
│   │   │   ├── rooms/route.ts        # GET + POST rooms
│   │   │   ├── rooms/[id]/route.ts   # PATCH + DELETE room
│   │   │   ├── members/route.ts      # GET + POST members
│   │   │   └── spots/route.ts        # GET + POST spots
│   │   │   └── spots/[id]/route.ts   # DELETE spot
│   │   ├── page.tsx                  # Main app UI
│   │   ├── page.module.css           # Styles
│   │   ├── layout.tsx                # Root layout
│   │   └── globals.css               # Global styles
│   └── lib/
│       └── supabase.ts               # Supabase client + types
└── supabase-schema.sql               # Run this in Supabase SQL editor
```

---

## Supabase schema

| Table | Key columns |
|-------|-------------|
| `rooms` | id, name, icon, created_at |
| `members` | id, name, created_at |
| `items` | id, name, room_id, spot, notes, member_id, quantity, expires_at, created_at |
| `spots` | id, room_id, name, created_at |

---

## Ideas for future features

- Auth — private family accounts
- Item image uploads
- Low stock / expiry push notifications
- Shopping list generated from expired or low-stock items
- Item history / audit log
- Barcode scanning
