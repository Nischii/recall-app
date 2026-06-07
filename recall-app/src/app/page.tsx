'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import type { Room, Member, Item } from '@/lib/supabase'
import styles from './page.module.css'

const ROOM_ICONS: Record<string, string> = {
  car: '🚗', tool: '🔧', bed: '🛏️', sofa: '🛋️', droplet: '🚿',
  'stairs-down': '📦', home: '🏠', kitchen: '🍳', garage: '🔩',
}
function ricon(name: string) { return ROOM_ICONS[name] || '📦' }

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

// Sub-locations stored per room in localStorage (key: room_id -> string[])
function getSublocs(roomId: string): string[] {
  try {
    const raw = localStorage.getItem(`sublocs_${roomId}`)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}
function saveSublocs(roomId: string, locs: string[]) {
  localStorage.setItem(`sublocs_${roomId}`, JSON.stringify(locs))
}

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
  const [form, setForm] = useState({ name: '', room_id: '', spot: '', notes: '', member_id: '' })
  const [toast, setToast] = useState('')
  const [sublocs, setSublocs] = useState<Record<string, string[]>>({})
  const [newSublocInput, setNewSublocInput] = useState('')
  const [managingRoom, setManagingRoom] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [r, m, i] = await Promise.all([
      fetch('/api/rooms').then(r => r.json()),
      fetch('/api/members').then(r => r.json()),
      fetch('/api/items').then(r => r.json()),
    ])
    const roomList: Room[] = Array.isArray(r) ? r : []
    const memberList: Member[] = Array.isArray(m) ? m : []
    setRooms(roomList)
    setMembers(memberList)
    setItems(Array.isArray(i) ? i : [])
    if (roomList.length > 0) setForm(f => ({ ...f, room_id: f.room_id || roomList[0].id }))
    if (memberList.length > 0) setForm(f => ({ ...f, member_id: f.member_id || memberList[0].id }))
    // Load sublocs for all rooms
    const sl: Record<string, string[]> = {}
    roomList.forEach(rm => { sl[rm.id] = getSublocs(rm.id) })
    setSublocs(sl)
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // When room changes in form, reset spot
  const handleFormRoomChange = (roomId: string) => {
    setForm(f => ({ ...f, room_id: roomId, spot: '' }))
  }

  const filteredItems = items.filter(it => {
    const memberOk = activeMember === 'everyone' || it.member_id === activeMember
    if (!memberOk) return false
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
      (activeMember === 'everyone' || it.member_id === activeMember)
    )

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
      setForm(f => ({ ...f, name: '', spot: '', notes: '' }))
      setTab('browse')
      setActiveRoom(form.room_id)
      setActiveSubLoc(form.spot || null)
      showToast('Item saved!')
    }
    setAdding(false)
  }

  async function handleDelete(id: string) {
    await fetch(`/api/items/${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(it => it.id !== id))
    showToast('Item removed')
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
      setSublocs(prev => ({ ...prev, [room.id]: [] }))
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

  function addSubloc(roomId: string) {
    const name = newSublocInput.trim()
    if (!name) return
    const updated = [...(sublocs[roomId] || []), name]
    setSublocs(prev => ({ ...prev, [roomId]: updated }))
    saveSublocs(roomId, updated)
    setNewSublocInput('')
    showToast(`"${name}" added to room`)
  }

  function deleteSubloc(roomId: string, loc: string) {
    const updated = (sublocs[roomId] || []).filter(l => l !== loc)
    setSublocs(prev => ({ ...prev, [roomId]: updated }))
    saveSublocs(roomId, updated)
    if (activeSubLoc === loc) setActiveSubLoc(null)
    if (form.spot === loc) setForm(f => ({ ...f, spot: '' }))
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

      {search ? (
        <div className={styles.searchResults}>
          <p className={styles.sectionTitle}>{filteredItems.length} result{filteredItems.length !== 1 ? 's' : ''}</p>
          {filteredItems.length === 0
            ? <div className={styles.empty}>Nothing found for &ldquo;{search}&rdquo;</div>
            : filteredItems.map(it => <ItemCard key={it.id} item={it} query={search} onDelete={handleDelete} memberName={memberName} />)
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
                        <button key={r.id} className={`${styles.roomCard} ${activeRoom === r.id ? styles.activeRoom : ''}`}
                          onClick={() => { setActiveRoom(activeRoom === r.id ? null : r.id); setActiveSubLoc(null) }}>
                          <div className={styles.roomIcon}>{ricon(r.icon)}</div>
                          <div className={styles.roomName}>{r.name}</div>
                          <div className={styles.roomCount}>{count} item{count !== 1 ? 's' : ''}</div>
                          {(sublocs[r.id]?.length > 0) && (
                            <div className={styles.roomSubCount}>{sublocs[r.id].length} spot{sublocs[r.id].length !== 1 ? 's' : ''}</div>
                          )}
                        </button>
                      )
                    })}
                    <button className={styles.addRoomCard} onClick={addRoom}>
                      <span className={styles.roomIcon}>＋</span>
                      <div className={styles.roomName}>Add room</div>
                    </button>
                  </div>

                  {activeRoom && (
                    <div>
                      {/* Sub-location bar */}
                      <div className={styles.sublocSection}>
                        <div className={styles.sublocHeader}>
                          <span className={styles.sectionTitle} style={{marginBottom:0}}>{roomName(activeRoom)}</span>
                          <button className={styles.manageBtn} onClick={() => setManagingRoom(managingRoom === activeRoom ? null : activeRoom)}>
                            {managingRoom === activeRoom ? 'Done' : '⚙ Manage spots'}
                          </button>
                        </div>

                        {/* Spot pills */}
                        <div className={styles.sublocPills}>
                          <button
                            className={`${styles.sublocPill} ${activeSubLoc === null ? styles.sublocActive : ''}`}
                            onClick={() => setActiveSubLoc(null)}>
                            All items
                          </button>
                          {(sublocs[activeRoom] || []).map(loc => (
                            <button
                              key={loc}
                              className={`${styles.sublocPill} ${activeSubLoc === loc ? styles.sublocActive : ''}`}
                              onClick={() => setActiveSubLoc(activeSubLoc === loc ? null : loc)}>
                              {loc}
                              <span className={styles.sublocBadge}>{roomItems(activeRoom, loc).length}</span>
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
                              {(sublocs[activeRoom] || []).length === 0 && (
                                <p className={styles.managePanelEmpty}>No spots yet. Add your first one below.</p>
                              )}
                              {(sublocs[activeRoom] || []).map(loc => (
                                <div key={loc} className={styles.managePanelRow}>
                                  <span className={styles.managePanelLoc}>📦 {loc}</span>
                                  <span className={styles.managePanelCount}>{roomItems(activeRoom, loc).length} item{roomItems(activeRoom, loc).length !== 1 ? 's' : ''}</span>
                                  <button className={styles.managePanelDel} onClick={() => deleteSubloc(activeRoom, loc)} title="Remove spot">✕</button>
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
                              <ItemCard key={it.id} item={it} query="" onDelete={handleDelete} memberName={memberName} />
                            )
                        }
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === 'add' && (
                <div className={styles.formCard}>
                  <p className={styles.sectionTitle}>Add an item</p>
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
                      {form.room_id && (sublocs[form.room_id] || []).length > 0 && (
                        <span className={styles.labelHint}> — pick a saved spot or type a new one</span>
                      )}
                    </label>
                    {form.room_id && (sublocs[form.room_id] || []).length > 0 ? (
                      <>
                        <div className={styles.spotPills}>
                          <button
                            type="button"
                            className={`${styles.spotPill} ${form.spot === '' ? styles.spotPillActive : ''}`}
                            onClick={() => setForm(f => ({ ...f, spot: '' }))}>
                            None
                          </button>
                          {(sublocs[form.room_id] || []).map(loc => (
                            <button
                              type="button"
                              key={loc}
                              className={`${styles.spotPill} ${form.spot === loc ? styles.spotPillActive : ''}`}
                              onClick={() => setForm(f => ({ ...f, spot: loc }))}>
                              {loc}
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
                  <div className={styles.formActions}>
                    <button className={styles.btnGhost} onClick={() => setForm(f => ({ ...f, name: '', spot: '', notes: '' }))}>Clear</button>
                    <button className={styles.btnPrimary} onClick={handleAdd} disabled={adding || !form.name.trim()}>
                      {adding ? 'Saving...' : '✓ Save item'}
                    </button>
                  </div>
                </div>
              )}

              {tab === 'recent' && (
                <div>
                  <p className={styles.sectionTitle}>Recently added</p>
                  {[...items].filter(it => activeMember === 'everyone' || it.member_id === activeMember).slice(0, 15)
                    .map(it => <ItemCard key={it.id} item={it} query="" onDelete={handleDelete} memberName={memberName} timeAgo={timeAgo(it.created_at)} />)
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

function ItemCard({ item, query, onDelete, memberName, timeAgo: ago }: {
  item: Item; query: string; onDelete: (id: string) => void
  memberName: (id: string | null) => string; timeAgo?: string
}) {
  const room = (item as any).rooms?.name || '—'
  const loc = item.spot ? `${room} › ${item.spot}` : room
  return (
    <div className={styles.itemCard}>
      <div className={styles.itemIcon}>{ROOM_ICONS[(item as any).rooms?.icon] || '📦'}</div>
      <div className={styles.itemInfo}>
        <div className={styles.itemName} dangerouslySetInnerHTML={{ __html: highlight(item.name, query) }} />
        <div className={styles.itemLoc}>📍 {loc}</div>
        {item.notes && <div className={styles.itemNotes}>{item.notes}</div>}
        <div className={styles.itemMeta}>
          <span className={styles.memberBadge}>{memberName(item.member_id)}</span>
          {ago && <span className={styles.timeAgo}>{ago}</span>}
        </div>
      </div>
      <button className={styles.deleteBtn} onClick={() => onDelete(item.id)} title="Remove item">🗑</button>
    </div>
  )
}
