'use client'
import { useEffect, useState, useCallback, useRef, CSSProperties } from 'react'
import type { Room, Member, Item, Spot } from '@/lib/supabase'
import styles from './page.module.css'

const ROOM_ICONS: Record<string, string> = {
  car: '🚗', tool: '🔧', bed: '🛏️', sofa: '🛋️', droplet: '🚿',
  'stairs-down': '📦', home: '🏠', kitchen: '🍳', garage: '🔩',
}
const ROOM_COLORS_LIGHT: Record<string, string> = {
  car: '#cbd5e1', tool: '#fde68a', bed: '#ddd6fe', sofa: '#bbf7d0',
  droplet: '#bae6fd', 'stairs-down': '#fed7aa', home: '#fef9c3',
  kitchen: '#fde68a', garage: '#cbd5e1',
}
const ROOM_COLORS_DARK: Record<string, string> = {
  car: '#1c2e3d', tool: '#2e2008', bed: '#1e1640', sofa: '#0e2218',
  droplet: '#0d1f2e', 'stairs-down': '#2e1a08', home: '#2a2508',
  kitchen: '#2e2008', garage: '#1c2e3d',
}
function ricon(name: string) { return ROOM_ICONS[name] || '📦' }
function rcolors(name: string) {
  return { '--lc': ROOM_COLORS_LIGHT[name] || '#f5f4fe', '--dc': ROOM_COLORS_DARK[name] || '#1e1640' } as CSSProperties
}

function timeAgo(ts: string) {
  const d = Date.now() - new Date(ts).getTime()
  const m = Math.floor(d / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function highlight(text: string, q: string) {
  if (!q) return text
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return text.replace(re, '<mark>$1</mark>')
}


const PRESET_TAGS = [
  '🍎 Food & Drink', '💊 Medicine', '🔧 Tools', '👕 Clothing',
  '💻 Electronics', '🧹 Cleaning', '📚 Books', '🏋️ Sports', '🌱 Garden', '🧸 Kids',
]

type Tab = 'browse' | 'add' | 'recent'

export default function RecallApp() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [tab, setTab] = useState<Tab>('browse')
  const [activeRoom, setActiveRoom] = useState<string | null>(null)
  const [activeSubLoc, setActiveSubLoc] = useState<string | null>(null)
  const [activeMember, setActiveMember] = useState<string>('everyone')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', room_id: '', spot: '', notes: '', member_id: '', quantity: '1', expires_at: '', tags: [] as string[] })
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [toast, setToast] = useState('')
  const [spots, setSpots] = useState<Spot[]>([])
  const [newSublocInput, setNewSublocInput] = useState('')
  const [managingRoom, setManagingRoom] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [r, m, i, sp] = await Promise.all([
      fetch('/api/rooms').then(r => r.json()),
      fetch('/api/members').then(r => r.json()),
      fetch('/api/items').then(r => r.json()),
      fetch('/api/spots').then(r => r.json()),
    ])
    const roomList: Room[] = Array.isArray(r) ? r : []
    const memberList: Member[] = Array.isArray(m) ? m : []
    setRooms(roomList)
    setMembers(memberList)
    setItems(Array.isArray(i) ? i : [])
    setSpots(Array.isArray(sp) ? sp : [])
    if (roomList.length > 0) setForm(f => ({ ...f, room_id: f.room_id || roomList[0].id }))
    if (memberList.length > 0) setForm(f => ({ ...f, member_id: f.member_id || memberList[0].id }))
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  useEffect(() => {
    if (activeMember !== 'everyone') {
      setForm(f => ({ ...f, member_id: activeMember }))
    }
  }, [activeMember])

  useEffect(() => {
    if (activeRoom) {
      setForm(f => ({ ...f, room_id: activeRoom }))
    }
  }, [activeRoom])

  // When room changes in form, reset spot
  const handleFormRoomChange = (roomId: string) => {
    setForm(f => ({ ...f, room_id: roomId, spot: '' }))
  }

  const tagMatch = (it: Item) =>
    activeTags.length === 0 || activeTags.some(t => (it.tags || []).includes(t))

  const filteredItems = items.filter(it => {
    if (activeMember !== 'everyone' && it.member_id !== activeMember) return false
    if (!tagMatch(it)) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      it.name.toLowerCase().includes(q) ||
      it.spot?.toLowerCase().includes(q) ||
      it.notes?.toLowerCase().includes(q) ||
      (it as any).rooms?.name?.toLowerCase().includes(q)
    )
  })

  const roomItems = (roomId: string, spot?: string | null) =>
    items.filter(it =>
      it.room_id === roomId &&
      (spot == null || it.spot === spot) &&
      (activeMember === 'everyone' || it.member_id === activeMember) &&
      tagMatch(it)
    )

  const allItemTags = Array.from(new Set(items.flatMap(it => it.tags || []))).filter(Boolean)

  function toggleFilterTag(tag: string) {
    setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  function toggleFormTag(tag: string) {
    setForm(f => ({ ...f, tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag] }))
  }

  async function handleAdd() {
    if (!form.name.trim() || !form.room_id) return
    setAdding(true)
    const res = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const newItem = await res.json()
      setItems(prev => [newItem, ...prev])
      setForm(f => ({ ...f, name: '', spot: '', notes: '', quantity: '1', expires_at: '', tags: [] }))
      setTab('browse')
      setActiveRoom(form.room_id)
      setActiveSubLoc(form.spot || null)
      showToast('Item saved!')
    }
    setAdding(false)
  }

  function startEdit(item: Item) {
    setEditingItemId(item.id)
    setForm({
      name: item.name,
      room_id: item.room_id,
      spot: item.spot || '',
      notes: item.notes || '',
      member_id: item.member_id || '',
      quantity: String(item.quantity ?? 1),
      expires_at: item.expires_at || '',
      tags: item.tags || [],
    })
    setTab('add')
  }

  function cancelEdit() {
    setEditingItemId(null)
    setForm(f => ({ ...f, name: '', spot: '', notes: '', quantity: '1', expires_at: '', tags: [] }))
    setTab('browse')
  }

  async function handleUpdate() {
    if (!form.name.trim() || !form.room_id || !editingItemId) return
    setAdding(true)
    const res = await fetch(`/api/items/${editingItemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const updated = await res.json()
      setItems(prev => prev.map(it => it.id === editingItemId ? updated : it))
      setEditingItemId(null)
      setForm(f => ({ ...f, name: '', spot: '', notes: '', quantity: '1', expires_at: '', tags: [] }))
      setTab('browse')
      showToast('Item updated!')
    } else {
      const err = await res.json().catch(() => ({}))
      showToast(`Failed to update: ${err.error || res.status}`)
    }
    setAdding(false)
  }

  async function handleDelete(id: string) {
    await fetch(`/api/items/${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(it => it.id !== id))
    showToast('Item removed')
  }

  async function deleteRoom(roomId: string, roomName: string) {
    if (!confirm(`Delete "${roomName}"? This cannot be undone.`)) return
    const res = await fetch(`/api/rooms/${roomId}`, { method: 'DELETE' })
    if (res.ok) {
      setRooms(prev => prev.filter(r => r.id !== roomId))
      setSpots(prev => prev.filter(s => s.room_id !== roomId))
      if (activeRoom === roomId) { setActiveRoom(null); setActiveSubLoc(null) }
      showToast(`"${roomName}" deleted`)
    } else {
      const err = await res.json().catch(() => ({}))
      showToast(err.error || 'Failed to delete room')
    }
  }

  async function editRoom(roomId: string, currentName: string) {
    const name = prompt('Rename room:', currentName)
    if (!name?.trim() || name.trim() === currentName) return
    const res = await fetch(`/api/rooms/${roomId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    })
    if (res.ok) {
      const updated = await res.json()
      setRooms(prev => prev.map(r => r.id === roomId ? updated : r))
      showToast(`Room renamed to "${updated.name}"`)
    } else {
      const err = await res.json().catch(() => ({}))
      showToast(`Failed to rename: ${err.error || res.status}`)
    }
  }

  async function addRoom() {
    const name = prompt('New room name:')
    if (!name?.trim()) return
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    })
    if (res.ok) {
      const room = await res.json()
      setRooms(prev => [...prev, room])
      showToast(`"${name.trim()}" added!`)
    } else {
      const err = await res.json().catch(() => ({}))
      showToast(`Failed to add room: ${err.error || res.status}`)
    }
  }

  async function addMember() {
    const name = prompt('New family member name:')
    if (!name?.trim()) return
    const res = await fetch('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    })
    if (res.ok) {
      const member = await res.json()
      setMembers(prev => [...prev, member])
    }
  }

  async function addSubloc(roomId: string) {
    const name = newSublocInput.trim()
    if (!name) return
    const res = await fetch('/api/spots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, room_id: roomId }),
    })
    if (res.ok) {
      const spot = await res.json()
      setSpots(prev => [...prev, spot])
      setNewSublocInput('')
      showToast(`"${name}" added`)
    } else {
      showToast('Failed to add spot')
    }
  }

  async function deleteSubloc(spot: Spot) {
    const res = await fetch(`/api/spots/${spot.id}`, { method: 'DELETE' })
    if (res.ok) {
      setSpots(prev => prev.filter(s => s.id !== spot.id))
      if (activeSubLoc === spot.name) setActiveSubLoc(null)
      if (form.spot === spot.name) setForm(f => ({ ...f, spot: '' }))
    } else {
      showToast('Failed to delete spot')
    }
  }

  const memberName = (id: string | null) => members.find(m => m.id === id)?.name || '—'
  const roomName = (id: string) => rooms.find(r => r.id === id)?.name || '—'

  return (
    <div className={styles.app}>
      {toast && <div className={styles.toast}>{toast}</div>}

      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoMark}>📍</span>
          <span className={styles.logoText}>Recall</span>
        </div>
        <div className={styles.memberBar}>
          <button className={`${styles.memberChip} ${activeMember === 'everyone' ? styles.active : ''}`} onClick={() => setActiveMember('everyone')}>All</button>
          {members.map(m => (
            <button key={m.id} className={`${styles.memberChip} ${activeMember === m.id ? styles.active : ''}`} onClick={() => setActiveMember(m.id)}>{m.name}</button>
          ))}
          <button className={styles.memberChip} onClick={addMember} title="Add member">+</button>
        </div>
      </header>

      <div className={styles.searchWrap}>
        <span className={styles.searchIcon}>🔍</span>
        <input ref={searchRef} className={styles.searchInput} type="text" placeholder="Search any item..." value={search} onChange={e => setSearch(e.target.value)} />
        {search && <button className={styles.clearBtn} onClick={() => setSearch('')}>✕</button>}
      </div>

      {allItemTags.length > 0 && (
        <div className={styles.tagFilterRow}>
          {allItemTags.map(tag => (
            <button key={tag}
              className={`${styles.tagFilterChip} ${activeTags.includes(tag) ? styles.tagFilterActive : ''}`}
              onClick={() => toggleFilterTag(tag)}>
              {tag}
            </button>
          ))}
          {activeTags.length > 0 && (
            <button className={styles.tagFilterClear} onClick={() => setActiveTags([])}>✕ Clear</button>
          )}
        </div>
      )}

      {search ? (
        <div className={styles.searchResults}>
          <p className={styles.sectionTitle}>{filteredItems.length} result{filteredItems.length !== 1 ? 's' : ''}</p>
          {filteredItems.length === 0
            ? <div className={styles.empty}>Nothing found for &ldquo;{search}&rdquo;</div>
            : filteredItems.map(it => <ItemCard key={it.id} item={it} query={search} onDelete={handleDelete} onEdit={startEdit} memberName={memberName} />)
          }
        </div>
      ) : (
        <>
          <nav className={styles.tabs}>
            {(['browse', 'add', 'recent'] as Tab[]).map(t => (
              <button key={t} className={`${styles.tab} ${tab === t ? styles.activeTab : ''}`} onClick={() => setTab(t)}>
                {t === 'browse' && '🏠 Browse'}
                {t === 'add' && '➕ Add item'}
                {t === 'recent' && '🕐 Recent'}
              </button>
            ))}
          </nav>

          {loading ? <div className={styles.empty}>Loading your home...</div> : (
            <>
              {tab === 'browse' && (
                <div>
                  <div className={styles.roomGrid}>
                    {rooms.map(r => {
                      const count = roomItems(r.id).length
                      return (
                        <button key={r.id} style={rcolors(r.icon)} className={`${styles.roomCard} ${activeRoom === r.id ? styles.activeRoom : ''}`}
                          onClick={() => { setActiveRoom(activeRoom === r.id ? null : r.id); setActiveSubLoc(null) }}>
                          <div className={styles.roomIcon}>{ricon(r.icon)}</div>
                          <div className={styles.roomName}>{r.name}</div>
                          <div className={styles.roomCount}>{count} item{count !== 1 ? 's' : ''}</div>
                          {spots.filter(s => s.room_id === r.id).length > 0 && (
                            <div className={styles.roomSubCount}>{spots.filter(s => s.room_id === r.id).length} spot{spots.filter(s => s.room_id === r.id).length !== 1 ? 's' : ''}</div>
                          )}
                        </button>
                      )
                    })}
                    <button className={styles.addRoomCard} onClick={addRoom}>
                      <span className={styles.roomIcon}>＋</span>
                      <div className={styles.roomName}>Add room</div>
                    </button>
                  </div>

                  {!activeRoom && (
                    <div className={styles.empty} style={{marginTop: 24}}>
                      Select a room to browse its items, or use the search bar to find anything.
                    </div>
                  )}

                  {activeRoom && (
                    <div>
                      {/* Sub-location bar */}
                      <div className={styles.sublocSection}>
                        <div className={styles.sublocHeader}>
                          <span className={styles.sectionTitle} style={{marginBottom:0}}>{roomName(activeRoom)}</span>
                          <div style={{display:'flex', gap:8}}>
                            <button className={styles.manageBtn} onClick={() => editRoom(activeRoom, roomName(activeRoom))}>✏️ Rename</button>
                            <button className={styles.manageBtn} onClick={() => setManagingRoom(managingRoom === activeRoom ? null : activeRoom)}>
                              {managingRoom === activeRoom ? 'Done' : '⚙ Manage spots'}
                            </button>
                            <button className={styles.manageBtnDanger} onClick={() => deleteRoom(activeRoom, roomName(activeRoom))}>🗑 Delete</button>
                          </div>
                        </div>

                        {/* Spot pills */}
                        <div className={styles.sublocPills}>
                          <button
                            className={`${styles.sublocPill} ${activeSubLoc === null ? styles.sublocActive : ''}`}
                            onClick={() => setActiveSubLoc(null)}>
                            All items
                          </button>
                          {spots.filter(s => s.room_id === activeRoom).map(spot => (
                            <button
                              key={spot.id}
                              className={`${styles.sublocPill} ${activeSubLoc === spot.name ? styles.sublocActive : ''}`}
                              onClick={() => setActiveSubLoc(activeSubLoc === spot.name ? null : spot.name)}>
                              {spot.name}
                              <span className={styles.sublocBadge}>{roomItems(activeRoom, spot.name).length}</span>
                            </button>
                          ))}
                          <button className={styles.sublocPillAdd}
                            onClick={() => setManagingRoom(activeRoom)}>+ Add spot</button>
                        </div>

                        {/* Manage spots panel */}
                        {managingRoom === activeRoom && (
                          <div className={styles.managePanel}>
                            <p className={styles.managePanelTitle}>Spots in {roomName(activeRoom)}</p>
                            <div className={styles.managePanelList}>
                              {spots.filter(s => s.room_id === activeRoom).length === 0 && (
                                <p className={styles.managePanelEmpty}>No spots yet. Add your first one below.</p>
                              )}
                              {spots.filter(s => s.room_id === activeRoom).map(spot => (
                                <div key={spot.id} className={styles.managePanelRow}>
                                  <span className={styles.managePanelLoc}>📦 {spot.name}</span>
                                  <span className={styles.managePanelCount}>{roomItems(activeRoom, spot.name).length} item{roomItems(activeRoom, spot.name).length !== 1 ? 's' : ''}</span>
                                  <button className={styles.managePanelDel} onClick={() => deleteSubloc(spot)} title="Remove spot">✕</button>
                                </div>
                              ))}
                            </div>
                            <div className={styles.managePanelAdd}>
                              <input
                                placeholder='e.g. Shelf 1, Yellow box, Black cubby…'
                                value={newSublocInput}
                                onChange={e => setNewSublocInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addSubloc(activeRoom)}
                              />
                              <button className={styles.btnPrimary} style={{flexShrink:0, padding:'8px 14px'}} onClick={() => addSubloc(activeRoom)}>Add</button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Items list */}
                      <div style={{marginTop: 12}}>
                        {activeSubLoc && (
                          <p className={styles.sectionTitle} style={{marginBottom:8}}>
                            📦 {activeSubLoc} — {roomItems(activeRoom, activeSubLoc).length} item{roomItems(activeRoom, activeSubLoc).length !== 1 ? 's' : ''}
                          </p>
                        )}
                        {roomItems(activeRoom, activeSubLoc).length === 0
                          ? <div className={styles.empty}>
                              Nothing here yet.{' '}
                              <button className={styles.linkBtn} onClick={() => { setTab('add'); setForm(f => ({ ...f, room_id: activeRoom, spot: activeSubLoc || '' })) }}>
                                Add an item →
                              </button>
                            </div>
                          : roomItems(activeRoom, activeSubLoc).map(it =>
                              <ItemCard key={it.id} item={it} query="" onDelete={handleDelete} onEdit={startEdit} memberName={memberName} />
                            )
                        }
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === 'add' && (
                <div className={styles.formCard}>
                  <p className={styles.sectionTitle}>{editingItemId ? 'Edit item' : 'Add an item'}</p>
                  <div className={styles.field}>
                    <label className={styles.label}>Item name *</label>
                    <input placeholder="e.g. Screwdriver set" value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && handleAdd()} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Room *</label>
                    <select value={form.room_id} onChange={e => handleFormRoomChange(e.target.value)}>
                      {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>

                  {/* Spot — dropdown of saved spots + custom */}
                  <div className={styles.field}>
                    <label className={styles.label}>
                      Spot / sub-location
                      {form.room_id && spots.filter(s => s.room_id === form.room_id).length > 0 && (
                        <span className={styles.labelHint}> — pick a saved spot or type a new one</span>
                      )}
                    </label>
                    {form.room_id && spots.filter(s => s.room_id === form.room_id).length > 0 ? (
                      <>
                        <div className={styles.spotPills}>
                          <button
                            type="button"
                            className={`${styles.spotPill} ${form.spot === '' ? styles.spotPillActive : ''}`}
                            onClick={() => setForm(f => ({ ...f, spot: '' }))}>
                            None
                          </button>
                          {spots.filter(s => s.room_id === form.room_id).map(spot => (
                            <button
                              type="button"
                              key={spot.id}
                              className={`${styles.spotPill} ${form.spot === spot.name ? styles.spotPillActive : ''}`}
                              onClick={() => setForm(f => ({ ...f, spot: spot.name }))}>
                              {spot.name}
                            </button>
                          ))}
                        </div>
                        <input
                          style={{marginTop: 8}}
                          placeholder="Or type a custom spot..."
                          value={form.spot}
                          onChange={e => setForm(f => ({ ...f, spot: e.target.value }))}
                        />
                      </>
                    ) : (
                      <input
                        placeholder="e.g. Top shelf, Red bin, Under the sink"
                        value={form.spot}
                        onChange={e => setForm(f => ({ ...f, spot: e.target.value }))}
                      />
                    )}
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Added by</label>
                    <select value={form.member_id} onChange={e => setForm(f => ({ ...f, member_id: e.target.value }))}>
                      {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Notes</label>
                    <input placeholder="e.g. Blue handle, next to the drill" value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Tags <span className={styles.labelHint}>(pick any that apply)</span></label>
                    <div className={styles.tagPills}>
                      {PRESET_TAGS.map(tag => (
                        <button type="button" key={tag}
                          className={`${styles.tagPill} ${form.tags.includes(tag) ? styles.tagPillActive : ''}`}
                          onClick={() => toggleFormTag(tag)}>
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{display:'flex', gap:12}}>
                    <div className={styles.field} style={{flex:1}}>
                      <label className={styles.label}>Quantity</label>
                      <input
                        type="number" min="1" placeholder="1"
                        value={form.quantity}
                        onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                      />
                    </div>
                    <div className={styles.field} style={{flex:2}}>
                      <label className={styles.label}>Expiry date <span className={styles.labelHint}>(optional)</span></label>
                      <input
                        type="date"
                        value={form.expires_at}
                        onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className={styles.formActions}>
                    {editingItemId ? (
                      <>
                        <button className={styles.btnGhost} onClick={cancelEdit}>Cancel</button>
                        <button className={styles.btnPrimary} onClick={handleUpdate} disabled={adding || !form.name.trim()}>
                          {adding ? 'Saving...' : '✓ Update item'}
                        </button>
                      </>
                    ) : (
                      <>
                        <button className={styles.btnGhost} onClick={() => setForm(f => ({ ...f, name: '', spot: '', notes: '', quantity: '1', expires_at: '' }))}>Clear</button>
                        <button className={styles.btnPrimary} onClick={handleAdd} disabled={adding || !form.name.trim()}>
                          {adding ? 'Saving...' : '✓ Save item'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {tab === 'recent' && (
                <div>
                  <p className={styles.sectionTitle}>Recently added</p>
                  {[...items].filter(it => activeMember === 'everyone' || it.member_id === activeMember).slice(0, 15)
                    .map(it => <ItemCard key={it.id} item={it} query="" onDelete={handleDelete} onEdit={startEdit} memberName={memberName} timeAgo={timeAgo(it.created_at)} />)
                  }
                  {items.length === 0 && <div className={styles.empty}>No items yet. Add your first one!</div>}
                </div>
              )}

            </>
          )}
        </>
      )}
    </div>
  )
}

function expiryBadge(expires_at: string | null) {
  if (!expires_at) return null
  const days = Math.ceil((new Date(expires_at).getTime() - Date.now()) / 86400000)
  if (days < 0) return { label: 'Expired', color: '#ef4444', bg: '#ef444420' }
  if (days === 0) return { label: 'Expires today', color: '#ef4444', bg: '#ef444420' }
  if (days <= 30) return { label: `Expires in ${days}d`, color: '#f59e0b', bg: '#f59e0b20' }
  return { label: `Exp: ${new Date(expires_at).toLocaleDateString()}`, color: '#6b7280', bg: 'transparent' }
}

function ItemCard({ item, query, onDelete, onEdit, memberName, timeAgo: ago }: {
  item: Item; query: string; onDelete: (id: string) => void; onEdit: (item: Item) => void
  memberName: (id: string | null) => string; timeAgo?: string
}) {
  const room = (item as any).rooms?.name || '—'
  const loc = item.spot ? `${room} › ${item.spot}` : room
  const expiry = expiryBadge(item.expires_at)
  return (
    <div className={styles.itemCard}>
      <div className={styles.itemIcon} style={rcolors((item as any).rooms?.icon || '')}>{ROOM_ICONS[(item as any).rooms?.icon] || '📦'}</div>
      <div className={styles.itemInfo}>
        <div className={styles.itemName} dangerouslySetInnerHTML={{ __html: highlight(item.name, query) }} />
        <div className={styles.itemLoc}>📍 {loc}</div>
        {item.notes && <div className={styles.itemNotes}>{item.notes}</div>}
        <div className={styles.itemMeta}>
          <span className={styles.memberBadge}>{memberName(item.member_id)}</span>
          {(item.quantity ?? 1) > 1 && (
            <span className={styles.memberBadge}>×{item.quantity}</span>
          )}
          {expiry && (
            <span style={{fontSize:11, padding:'2px 7px', borderRadius:999, fontWeight:600,
              color: expiry.color, background: expiry.bg, border: `1px solid ${expiry.color}40`}}>
              {expiry.label}
            </span>
          )}
          {ago && <span className={styles.timeAgo}>{ago}</span>}
        </div>
        {(item.tags || []).length > 0 && (
          <div className={styles.itemTagRow}>
            {(item.tags || []).map(tag => (
              <span key={tag} className={styles.tagBadge}>{tag}</span>
            ))}
          </div>
        )}
      </div>
      <div style={{display:'flex', flexDirection:'column', gap:6, flexShrink:0}}>
        <button className={styles.deleteBtn} onClick={() => onEdit(item)} title="Edit item">✏️</button>
        <button className={styles.deleteBtn} onClick={() => onDelete(item.id)} title="Remove item">🗑</button>
      </div>
    </div>
  )
}
