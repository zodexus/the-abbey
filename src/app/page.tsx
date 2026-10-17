'use client';
import { useEffect, useState } from 'react';
import Script from 'next/script';
import { ArrowLeft, ArrowRight, Check, Clock3, Guitar, LockKeyhole, Plus, RefreshCw, ShieldCheck, X } from 'lucide-react';

type Booking = { id: string; starts_at: string; ends_at: string; status: string; mine: boolean; resident_name: string; purpose: string };
type License = { id: string; handle: string; name: string; active: boolean; telegram_user_id: number | null };
type Session = { name: string; admin: boolean; userId: number };
declare global { interface Window { Telegram?: { WebApp: { initData: string; ready: () => void; expand: () => void } } } }
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const shift = (d: string, n: number) => new Date(new Date(`${d}T12:00:00+08:00`).getTime() + n * 86400000).toISOString().slice(0,10);
const dayLabel = (d: string, options: Intl.DateTimeFormatOptions) => new Date(`${d}T12:00:00+08:00`).toLocaleDateString('en-SG', { timeZone: 'Asia/Singapore', ...options });
const clock = (d: string) => new Date(d).toLocaleTimeString('en-SG', { timeZone: 'Asia/Singapore', hour: 'numeric', minute: '2-digit' });
const timeLabel = (minutes: number) => minutes === 1440 ? 'Midnight' : `${minutes % 720 < 60 ? 12 : Math.floor(minutes % 720 / 60)}:${String(minutes % 60).padStart(2, '0')} ${minutes < 720 ? 'am' : 'pm'}`;
function sampleBookings(date: string): Booking[] {
  return [
    { id: 'demo-1', starts_at: `${date}T14:00:00+08:00`, ends_at: `${date}T16:00:00+08:00`, status: 'confirmed', mine: false, resident_name: '', purpose: '' },
    { id: 'demo-2', starts_at: `${date}T19:00:00+08:00`, ends_at: `${date}T21:00:00+08:00`, status: 'confirmed', mine: true, resident_name: 'Alex', purpose: 'Band practice' },
    { id: 'demo-3', starts_at: `${shift(date, 1)}T18:00:00+08:00`, ends_at: `${shift(date, 1)}T19:30:00+08:00`, status: 'pending', mine: true, resident_name: 'Alex', purpose: 'Drum practice' },
  ];
}
export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [demo, setDemo] = useState(false);
  const [authError, setAuthError] = useState('');
  const [tab, setTab] = useState('calendar');
  const [week, setWeek] = useState(today);
  const [date, setDate] = useState(today);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const [form, setForm] = useState<{ date: string; time: string; duration: number; name: string; purpose: string; requestId: string } | null>(null);
  const [cancelId, setCancelId] = useState('');
  const [handle, setHandle] = useState('');
  const [licenseName, setLicenseName] = useState('');

  async function api(path: string, method = 'GET', body?: unknown) {
    const response = await fetch(path, { method, headers: { 'Content-Type': 'application/json', 'x-telegram-init-data': window.Telegram?.WebApp.initData || '' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not connect. Please try again.');
    return result;
  }
  async function connect() {
    const app = window.Telegram?.WebApp;
    if (!app?.initData) return;
    app.ready(); app.expand();
    try { setSession(await api('/api/session')); } catch (e) { setAuthError((e as Error).message); }
  }
  useEffect(() => { void connect(); }, []);
  useEffect(() => {
    if (!session || demo) return;
    let live = true;
    setLoading(true); setError('');
    const path = tab === 'licenses' ? '/api/licenses' : `/api/bookings?date=${week}${tab === 'mine' ? '&mine=1' : ''}`;
    api(path).then(result => { if (live) { if (tab === 'licenses') setLicenses(result.licenses); else setBookings(result.bookings); } })
      .catch(e => { if (live) { setError(e.message); setBookings([]); } })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [session, demo, tab, week, revision]);
  useEffect(() => {
    if (!session || demo) return;
    const timer = setInterval(() => setRevision(v => v + 1), 60000);
    return () => clearInterval(timer);
  }, [session, demo]);

  function preview() {
    setDemo(true); setSession({ name: 'Alex', admin: true, userId: 1 });
    setBookings(sampleBookings(today()));
    setLicenses([{ id: 'sample', handle: 'example_resident', name: 'Example resident', active: true, telegram_user_id: null }]);
  }
  function openForm(minutes = date === today() ? Math.ceil((Date.now() - new Date(`${date}T00:00:00+08:00`).getTime()) / 900000) * 15 : 18 * 60) {
    setError(''); setNotice('');
    setForm({ date: minutes >= 1440 ? shift(date,1) : date, time: `${String(Math.floor(minutes % 1440 / 60)).padStart(2,'0')}:${String(minutes % 60).padStart(2,'0')}`, duration: 120, name: session?.name || '', purpose: '', requestId: crypto.randomUUID() });
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (!form || busy) return;
    setBusy(true); setError('');
    try {
      const start = new Date(`${form.date}T${form.time}:00+08:00`);
      const end = new Date(start.getTime() + form.duration * 60000);
      if (start.getTime() <= Date.now()) throw new Error('Choose a time in the future.');
      if (demo) {
        if (bookings.some(b => b.status === 'confirmed' && new Date(b.starts_at) < end && new Date(b.ends_at) > start)) throw new Error('That slot is booked. Choose another time.');
        setBookings(b => [...b, { id: crypto.randomUUID(), starts_at: start.toISOString(), ends_at: end.toISOString(), status: 'pending', mine: true, resident_name: form.name, purpose: form.purpose }]);
        setNotice('Preview request saved on this page. No message was sent.');
      } else {
        const result = await api('/api/bookings', 'POST', form);
        setNotice(result.notificationPending ? 'Request saved. Telegram delivery is delayed; the quartermaster can find it in /pending.' : 'Request sent to the quartermaster. You’ll receive the decision in Telegram.');
      }
      setForm(null); setTab('mine'); setRevision(v => v + 1);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function cancel(id: string) {
    setBusy(true); setError('');
    try {
      if (demo) setBookings(rows => rows.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
      else await api('/api/bookings', 'PATCH', { id });
      setNotice(demo ? 'Preview booking cancelled.' : 'Booking cancelled.'); setCancelId(''); setRevision(v => v + 1);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function addLicense(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const clean = handle.trim().replace(/^@/, '').toLowerCase();
      if (!/^[a-z][a-z0-9_]{3,31}$/.test(clean)) throw new Error('Enter a valid Telegram handle.');
      if (demo) setLicenses(rows => rows.some(l => l.handle === clean) ? rows : [...rows, { id: crypto.randomUUID(), handle: clean, name: licenseName, active: true, telegram_user_id: null }]);
      else await api('/api/licenses', 'POST', { handle: clean, name: licenseName });
      setHandle(''); setLicenseName(''); setRevision(v => v + 1); setNotice('Handle added. Existing entries keep their current access status.');
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function toggleLicense(l: License) {
    setBusy(true); setError('');
    try {
      if (demo) setLicenses(rows => rows.map(row => row.id === l.id ? { ...row, active: !row.active } : row));
      else await api('/api/licenses', 'PATCH', { id: l.id, active: !l.active });
      setRevision(v => v + 1);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  const dayStart = new Date(`${date}T00:00:00+08:00`).getTime();
  const dayBookings = bookings.filter(b => ['pending','confirmed'].includes(b.status) && new Date(b.starts_at).getTime() < dayStart + 86400000 && new Date(b.ends_at).getTime() > dayStart).sort((a,b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
  const blocks: { start: number; end: number; booking?: Booking }[] = [];
  let cursor = 0;
  for (const b of dayBookings.filter(b => b.status === 'confirmed')) {
    const start = Math.max(0, (Date.parse(b.starts_at) - dayStart) / 60000);
    const end = Math.min(1440, (Date.parse(b.ends_at) - dayStart) / 60000);
    if (start > cursor) blocks.push({ start: cursor, end: start });
    blocks.push({ start, end, booking: b }); cursor = Math.max(cursor, end);
  }
  if (cursor < 1440) blocks.push({ start: cursor, end: 1440 });
  const freeHours = blocks.filter(b => !b.booking).reduce((sum,b) => sum + (b.end-b.start)/60, 0);

  return <>
    <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" onReady={() => { void connect(); }} />
    <div className="shell" inert={!!form}>
      <header className="masthead"><a className="brand" href="/"><span className="brand-icon"><Guitar size={23}/></span><span>The Abbey<small>TEMBUSU COLLEGE</small></span></a><span className="pill"><span className="dot"/> Bandroom bookings</span></header>
      {!session ? <main className="welcome">
        <span className="eyebrow">A LITTLE SPACE. A LOT OF SOUND.</span>
        <h1>Your next session<br/>starts here.</h1><p>Find a little room to make some noise.<br/>Check the calendar, pick a time, and we’ll handle the rest.</p>
        <div className="welcome-card"><LockKeyhole size={24}/><h2>Come on in through Telegram.</h2><p>The calendar is for Abbey-licensed residents. Open it from our bot so we can check your access.</p>{authError && <p role="alert" className="error">{authError}</p>}<a className="primary" href="https://t.me/TheAbbeyBot">Open @TheAbbeyBot <ArrowRight size={17}/></a><button className="text-button" onClick={preview}>Try the calendar preview</button></div>
        <p className="footnote">Already licensed but can’t get in? Ask the quartermaster to add your Telegram handle.</p>
      </main> : <main>
        {demo && <div className="preview-banner"><span>Preview mode · sample bookings, no live changes</span><button onClick={() => { setDemo(false); setSession(null); setBookings([]); setNotice(''); }}>Exit preview</button></div>}
        <section className="intro"><span className="eyebrow">MAKE ROOM FOR MUSIC</span><div className="intro-row"><div><h1>Find your next session.</h1><p>A space to practise, rehearse, and play.</p></div><span className="access-badge"><ShieldCheck size={17}/> Licensed access</span></div></section>
        <nav className="tabs" aria-label="Sections">{[['calendar','Calendar'],['mine','My bookings'],...(session.admin ? [['licenses','Licensed users']] : [])].map(([id,label]) => <button key={id} aria-current={tab === id ? 'page' : undefined} className={tab === id ? 'active' : ''} onClick={() => { setTab(id); setError(''); }}>{label}</button>)}</nav>
        {notice && <div className="notice" role="status"><Check size={18}/><span>{notice}</span><button aria-label="Dismiss notice" onClick={() => setNotice('')}><X size={16}/></button></div>}
        {error && !form && <div className="error" role="alert">{error}</div>}
        {tab === 'calendar' && <section className="calendar">
          <div className="section-heading"><div><h2>{dayLabel(week, { month: 'long', year: 'numeric' })}</h2><span className="muted">All times in Singapore · SGT</span></div><div className="controls"><button aria-label="Previous week" onClick={() => { setWeek(shift(week,-7)); setDate(shift(week,-7)); }}><ArrowLeft size={18}/></button><button onClick={() => { setWeek(today()); setDate(today()); }}>Today</button><button aria-label="Next week" onClick={() => { setWeek(shift(week,7)); setDate(shift(week,7)); }}><ArrowRight size={18}/></button></div></div>
          <div className="week" role="group" aria-label="Select a day">{Array.from({length:7},(_,i) => shift(week,i)).map(d => <button className={date === d ? 'selected' : ''} aria-pressed={date === d} key={d} onClick={() => setDate(d)}><span>{dayLabel(d, {weekday:'short'})}</span><strong>{Number(d.slice(-2))}</strong><i className={bookings.some(b => b.status === 'confirmed' && b.starts_at.slice(0,10) === d) ? 'has-booking' : ''}/></button>)}</div>
          <div className="day-heading"><div><h2>{dayLabel(date, {weekday:'long', day:'numeric', month:'short'})}</h2><span className="muted">{loading ? 'Updating schedule…' : error ? 'Schedule unavailable' : `${freeHours.toLocaleString()} hours unbooked`}</span></div><button className="icon-button" aria-label="Refresh calendar" onClick={() => setRevision(v => v+1)}><RefreshCw size={17}/></button></div>
          <div className="legend"><span><i className="available-dot"/> Available to request</span><span><i className="booked-dot"/> Booked</span></div>
          {loading ? <div className="empty" role="status">Loading the Abbey schedule…</div> : !error && <div className="schedule">{blocks.map((block,i) => {
            const elapsed = dayStart + block.end * 60000 <= Date.now();
            return <div className={`slot ${block.booking ? 'booked' : 'available'} ${elapsed ? 'elapsed' : ''}`} key={i}><div className="slot-time">{timeLabel(block.start)}<span>{timeLabel(block.end)}</span></div><div className="slot-body"><strong>{block.booking ? block.booking.mine ? 'Your session' : 'Abbey booked' : 'Room to play'}</strong><span>{block.booking ? block.booking.purpose || 'Reserved session' : elapsed ? 'Earlier today / past availability' : 'Choose a time within this window'}</span></div>{!block.booking && !elapsed && <button aria-label={`Request a slot from ${timeLabel(block.start)}`} className="slot-add" onClick={() => openForm(Math.max(block.start, date === today() ? Math.ceil((Date.now()-dayStart)/900000)*15 : block.start))}><Plus size={20}/></button>}{block.booking && <span className="status confirmed">Booked</span>}</div>;
          })}</div>}
          {dayBookings.some(b => b.status === 'pending') && <p className="pending-note">{dayBookings.filter(b=>b.status==='pending').length} pending request(s) on this day. Pending requests do not reserve a slot.</p>}
          <div className="booking-footer"><span><Clock3 size={17}/> Every request is reviewed by the quartermaster.</span><button className="primary" disabled={loading || !!error} onClick={() => openForm()}>Request a session <Plus size={18}/></button></div>
        </section>}
        {tab === 'mine' && <section className="panel"><div className="section-heading"><div><h2>Your upcoming sessions</h2><p className="muted">Decisions arrive in your Telegram chat.</p></div></div>{loading ? <p>Loading…</p> : bookings.filter(b => b.mine).length === 0 ? <div className="empty"><Guitar size={32}/><h3>Your next session is waiting.</h3><p>Pick a time in the calendar to get started.</p><button className="primary" onClick={() => setTab('calendar')}>Find a slot</button></div> : bookings.filter(b => b.mine).map(b => <article className="booking-card" key={b.id}><div><span className={`status ${b.status}`}>{b.status}</span><h3>{b.purpose}</h3><p>{new Date(b.starts_at).toLocaleDateString('en-SG',{timeZone:'Asia/Singapore',month:'short',day:'numeric'})} · {clock(b.starts_at)} – {clock(b.ends_at)}{new Date(b.ends_at).toLocaleDateString('en-SG',{timeZone:'Asia/Singapore'}) !== new Date(b.starts_at).toLocaleDateString('en-SG',{timeZone:'Asia/Singapore'}) ? ' (next day)' : ''}</p></div>{['pending','confirmed'].includes(b.status) && <div>{cancelId === b.id ? <div className="cancel-confirm"><span>Cancel this booking?</span><button disabled={busy} onClick={() => cancel(b.id)}>Yes, cancel</button><button onClick={() => setCancelId('')}>Keep</button></div> : <button className="text-button" onClick={() => setCancelId(b.id)}>Cancel booking</button>}</div>}</article>)}</section>}
        {tab === 'licenses' && session.admin && <section className="panel"><h2>Who can book the Abbey?</h2><p className="muted">Add licensed residents by Telegram handle. Access binds to their account on first use.</p><form className="license-form" onSubmit={addLicense}><label>Telegram handle<input placeholder="@username" required value={handle} onChange={e=>setHandle(e.target.value)}/></label><label>Name<input placeholder="Resident’s name" value={licenseName} onChange={e=>setLicenseName(e.target.value)} maxLength={80}/></label><button disabled={busy} className="primary">Add resident <Plus size={16}/></button></form><div className="license-list">{loading ? <p>Loading registry…</p> : licenses.length === 0 ? <p className="empty">No residents yet. Add a licensed Telegram handle above.</p> : licenses.map(l=><article className="license-row" key={l.id}><span className="avatar">{(l.name || l.handle).slice(0,1).toUpperCase()}</span><div><strong>{l.name || l.handle}</strong><span>@{l.handle} · {l.telegram_user_id ? 'Account linked' : 'Awaiting first visit'}</span></div><span className={`status ${l.active ? 'confirmed' : 'cancelled'}`}>{l.active ? 'Active' : 'Revoked'}</span><button disabled={busy} className="text-button" onClick={()=>toggleLicense(l)}>{l.active ? 'Revoke' : 'Restore'}</button></article>)}</div><p className="footnote">Revoking access blocks new use immediately. Existing confirmed bookings remain; review those separately if needed.</p></section>}
        <footer><span>The Abbey · Tembusu Arts Committee</span><span>Good music. Shared space.</span></footer>
      </main>}
    </div>
    {form && <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="booking-title"><div className="section-heading"><div><span className="eyebrow">LET’S MAKE SOME MUSIC</span><h2 id="booking-title">Request a session</h2></div><button className="icon-button" aria-label="Close booking form" disabled={busy} onClick={()=>{setForm(null);setError('');}}><X/></button></div><form onSubmit={submit}>
      <label>Your name<input autoFocus required maxLength={80} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><div className="form-row"><label>Date<input type="date" min={today()} required value={form.date} onInput={e=>{ const value=e.currentTarget.value; setForm(current=>current ? {...current,date:value} : null); }}/></label><label>Start time (SGT)<input type="time" required value={form.time} onInput={e=>{ const value=e.currentTarget.value; setForm(current=>current ? {...current,time:value} : null); }}/></label></div><label>Duration (minutes)<input type="number" min={15} max={1440} step={15} required value={form.duration} onChange={e=>setForm({...form,duration:Number(e.target.value)})}/></label><label>What are you practising?<textarea required maxLength={400} placeholder="Band practice, drum practice, rehearsal for an event…" value={form.purpose} onChange={e=>setForm({...form,purpose:e.target.value})}/></label><p className="request-summary">{form.date && form.time && Number.isFinite(Date.parse(`${form.date}T${form.time}:00+08:00`)) ? `Ends ${new Date(new Date(`${form.date}T${form.time}:00+08:00`).getTime()+form.duration*60000).toLocaleString('en-SG',{timeZone:'Asia/Singapore',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})} SGT` : 'Choose a date and time.'}<br/>Your slot is reserved only after approval.</p>{error && <div className="error" role="alert">{error}</div>}<button disabled={busy} className="primary full">{busy ? 'Sending…' : demo ? 'Try request in preview' : 'Send booking request'}<ArrowRight size={17}/></button>
    </form></section></div>}
  </>;
}
