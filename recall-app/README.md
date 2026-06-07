# 📍 Recall — Find anything at home

Track where you keep everything in your house. Never lose an item again.
Built with Next.js, Supabase (database), and Claude AI (smart search).

---

## 🚀 Deploy in 3 steps

### Step 1 — Set up Supabase (your database)

1. Go to [supabase.com](https://supabase.com) and sign up free
2. Click **New project**, give it a name (e.g. "recall"), choose a region
3. Once created, go to **SQL Editor** in the left sidebar
4. Paste the contents of `supabase-schema.sql` and click **Run**
5. Go to **Settings → API** and copy:
   - **Project URL** (looks like `https://abc123.supabase.co`)
   - **anon / public key** (long string starting with `eyJ...`)

---

### Step 2 — Deploy to Vercel

1. Push this project to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial Recall app"
   # Create a repo on github.com, then:
   git remote add origin https://github.com/YOUR_USERNAME/recall-app.git
   git push -u origin main
   ```

2. Go to [vercel.com](https://vercel.com) → **Add New Project** → Import your GitHub repo

3. During setup, add these **Environment Variables**:
   ```
   NEXT_PUBLIC_SUPABASE_URL       = https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY  = eyJ...your-anon-key...
   ANTHROPIC_API_KEY              = sk-ant-...your-key...
   ```
   - Get your Anthropic API key from [console.anthropic.com](https://console.anthropic.com)

4. Click **Deploy** — Vercel builds and gives you a live URL like `https://recall-app.vercel.app`

---

### Step 3 — Use it!

Open your live URL. Your app is live and ready for the whole family.

- **Browse rooms** — tap any room to see what's stored there
- **Add item** — name, room, specific spot, who added it, notes
- **Search** — instant search across all items
- **AI search** — ask in plain English ("where did Dad put the drill?")
- **Family filter** — tap a name at the top to filter to one person's items

---

## 🛠 Local development

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill in your env vars
cp .env.local.example .env.local
# Edit .env.local with your Supabase and Anthropic keys

# 3. Run the dev server
npm run dev

# Open http://localhost:3000
```

---

## 📁 Project structure

```
src/
├── app/
│   ├── api/
│   │   ├── items/route.ts       # GET + POST items
│   │   ├── items/[id]/route.ts  # DELETE item
│   │   ├── rooms/route.ts       # GET + POST rooms
│   │   ├── members/route.ts     # GET + POST members
│   │   └── search/route.ts      # AI smart search (Claude)
│   ├── page.tsx                 # Main app UI
│   ├── page.module.css          # Styles
│   ├── layout.tsx               # Root layout
│   └── globals.css              # Global styles
├── lib/
│   └── supabase.ts              # Supabase client + types
supabase-schema.sql              # Run this in Supabase SQL editor
```

---

## 💡 Ideas for future features

- Photo attachment per item
- Item categories / tags
- Edit items (not just delete)
- Push notifications ("Did you put the passport back?")
- Barcode scanning
- Share with family via invite link
