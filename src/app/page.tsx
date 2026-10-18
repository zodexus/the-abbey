'use client';
import { memo, useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Script from 'next/script';
import { ChevronLeft, ChevronRight, Plus, RefreshCw, Search, UserRound, X } from 'lucide-react';
import { bookingsByDay, clock, halfHourTimes, sortBookings, dateLabel, monthDays, shiftDay, shiftMonth, singaporeDate, slotLabel, today } from '@/lib/calendar';

type Booking = { id: string; starts_at: string; ends_at: string; status: string; mine: boolean; resident_name: string; purpose: string };
type Session = { name: string; admin: boolean; userId: number };
type BookingForm = { date: string; time: string; duration: number; name: string; purpose: string; requestId: string };
declare global { interface Window { Telegram?: { WebApp: { initData: string; ready: () => void; expand: () => void } } } }
function samples(month: string): Booking[] {
  return ['Kevin Tan','Sonia','Rachel','Jonathan','Supperific Kit Yee','Daniella','Tempo'].flatMap((name, i) => [1, 2, 3].map(n => ({ id: `sample-${i}-${n}`, starts_at: `${shiftDay(`${month.slice(0,7)}-01`, i * 3 + n)}T${n === 1 ? '13' : n === 2 ? '17' : '20'}:00:00+08:00`, ends_at: `${shiftDay(`${month.slice(0,7)}-01`, i * 3 + n)}T${n === 1 ? '15' : n === 2 ? '19' : '22'}:00:00+08:00`, resident_name: name, purpose: 'Band practice', status: 'confirmed', mine: i === 0 })));
}
const BookingSearch = memo(function BookingSearch({ onSearch }: { onSearch: (value: string) => void }) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const composing = useRef(false);
  const [, startTransition] = useTransition();
  useEffect(() => () => clearTimeout(timer.current), []);
  function schedule(value: string) {
    clearTimeout(timer.current);
    if (!composing.current) timer.current = setTimeout(() => startTransition(() => onSearch(value)), 150);
  }
  return <input className="search" autoFocus aria-label="Search by name" placeholder="Search bookings…"
    onChange={event => schedule(event.currentTarget.value)}
    onCompositionStart={() => { composing.current = true; clearTimeout(timer.current); }}
    onCompositionEnd={event => { composing.current = false; schedule(event.currentTarget.value); }}/>;
});
const MonthlyCalendar = memo(function MonthlyCalendar({ month, bookings, loading, currentDay, onBook, onSelect }: {
  month: string; bookings: Booking[]; loading: boolean; currentDay: string;
  onBook: (date: string) => void; onSelect: (booking: Booking) => void;
}) {
  const days = useMemo(() => monthDays(month), [month]);
  const byDay = useMemo(() => bookingsByDay(bookings, days[0]), [bookings, days]);
  return <div className="calendar-scroll" role="region" aria-label="Monthly calendar, Singapore time" tabIndex={0}>
          <div className="calendar" aria-busy={loading}><div className="weekdays">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => <div key={day}>{day}</div>)}</div>
            {Array.from({length:days.length / 7},(_,week) => <div className="calendar-week" key={week}>{days.slice(week * 7,week * 7 + 7).map((date,i) => {
              const rows = byDay.get(date) || [];
              return <section key={date} aria-label={dateLabel(date,{weekday:'long',month:'long',day:'numeric'})} className={`day ${i === 0 || i === 6 ? 'weekend' : ''} ${date.slice(0,7) !== month.slice(0,7) ? 'outside' : ''}`}>
                <div className="day-heading">{date >= currentDay && <button className="day-add" aria-label={`Book ${date}`} onClick={() => onBook(date)}><Plus size={19}/></button>}<span className={date === currentDay ? 'date current' : 'date'}>{date.endsWith('-01') ? dateLabel(date,{month:'short',day:'numeric'}) : Number(date.slice(-2))}</span></div>
                {rows.map(b => <button key={b.id} className={`event ${b.status}`} onClick={() => onSelect(b)} aria-label={`${b.resident_name}, ${clock(b.starts_at)} to ${clock(b.ends_at)}, ${b.status}`}><span className="event-heading"><strong>{b.resident_name || 'Booked'}</strong><span className="event-time">{clock(b.starts_at)} - {clock(b.ends_at)}{singaporeDate(b.ends_at) !== singaporeDate(b.starts_at) && <small> (+1 day)</small>}</span></span><span className="event-purpose">{b.purpose && b.purpose !== 'Imported from Notion' ? b.purpose : 'Purpose not recorded'}</span>{b.status === 'pending' && <span className="pending-label">Pending</span>}</button>)}
              </section>;
            })}</div>)}
          </div>
        </div>;
});
export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [demo, setDemo] = useState(false);
  const [authError, setAuthError] = useState('');
  const [month, setMonth] = useState(() => `${today().slice(0,7)}-01`);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [mine, setMine] = useState(false);
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const [form, setForm] = useState<BookingForm | null>(null);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const dialog = useRef<HTMLElement>(null);
  const busyRef = useRef(busy);
  busyRef.current = busy;
  const modalOpen = Boolean(form || selected);
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
    if (!session || demo || modalOpen) return;
    let live = true;
    setLoading(true); setError(''); setBookings([]);
    api(`/api/bookings?date=${monthDays(month)[0]}`).then(result => { if (live) setBookings(result.bookings); })
      .catch(e => { if (live) setError(e.message); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [session, demo, month, revision, modalOpen]);
  useEffect(() => {
    if (!session || demo || modalOpen) return;
    const timer = setInterval(() => setRevision(v => v + 1), 60000);
    return () => clearInterval(timer);
  }, [session, demo, modalOpen]);
  useEffect(() => {
    if (!modalOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const firstControl = dialog.current?.querySelector<HTMLElement>('input,select,textarea') || dialog.current?.querySelector<HTMLElement>('button');
    firstControl?.focus({ preventScroll: true });
    function keydown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busyRef.current) { setForm(null); setSelected(null); setError(''); }
      if (event.key === 'Tab') {
        const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, textarea') || []);
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); document.body.style.overflow = previousOverflow; previous?.focus({ preventScroll: true }); };
  }, [modalOpen]);
  function preview() { setDemo(true); setSession({ name: 'Alex', admin: true, userId: 1 }); setBookings(samples(month)); }
  const openForm = useCallback((date = today()) => {
    const minutes = date === today() ? Math.ceil((Date.now() - Date.parse(`${date}T00:00:00+08:00`)) / 1800000) * 30 : 18 * 60;
    setError(''); setNotice('');
    setForm({ date: minutes >= 1440 ? shiftDay(date,1) : date, time: `${String(Math.floor(minutes % 1440 / 60)).padStart(2,'0')}:${String(minutes % 60).padStart(2,'0')}`, duration: 120, name: session?.name || '', purpose: '', requestId: crypto.randomUUID() });
  }, [session?.name]);
  const selectBooking = useCallback((booking: Booking) => {
    setSelected(booking); setConfirmCancel(false); setError('');
  }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!form || busy) return;
    const fields = new FormData(event.currentTarget);
    const submitted = { ...form, name: String(fields.get('name') || '').trim(), purpose: String(fields.get('purpose') || '').trim(), date: String(fields.get('date') || ''), time: String(fields.get('time') || ''), duration: Number(fields.get('duration')) * 60 };
    setBusy(true); setError('');
    try {
      const start = new Date(`${submitted.date}T${submitted.time}:00+08:00`), end = new Date(start.getTime() + submitted.duration * 60000);
      if (start.getTime() <= Date.now()) throw new Error('Choose a time in the future.');
      if (demo) {
        if (bookings.some(b => b.status === 'confirmed' && new Date(b.starts_at) < end && new Date(b.ends_at) > start)) throw new Error('That slot is booked. Choose another time.');
        setBookings(b => [...b, { id: crypto.randomUUID(), starts_at: start.toISOString(), ends_at: end.toISOString(), status: 'pending', mine: true, resident_name: submitted.name, purpose: submitted.purpose }]);
        setNotice(`Pending approval: ${slotLabel(start.toISOString(), end.toISOString())}. Tap your pending booking to cancel.`);
      } else {
        await api('/api/bookings', 'POST', submitted);
        setNotice(`Pending approval: ${slotLabel(start.toISOString(), end.toISOString())}. Tap your pending booking to cancel.`);
      }
      setMonth(`${submitted.date.slice(0,7)}-01`); setForm(null); setRevision(v => v + 1);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function cancel() {
    if (!selected || busy) return;
    setBusy(true); setError('');
    try {
      if (demo) setBookings(rows => rows.filter(b => b.id !== selected.id));
      else await api('/api/bookings', 'PATCH', { id: selected.id });
      setSelected(null); setNotice('Booking cancelled.'); setRevision(v => v + 1);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  const visible = useMemo(() => sortBookings(bookings).filter(b => ['confirmed','pending'].includes(b.status) && (!mine || b.mine) && b.resident_name.toLowerCase().includes(search.toLowerCase())), [bookings, mine, search]);
  return <>
    <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" onReady={() => { void connect(); }} />
    <main className="shell" inert={!!form || !!selected}>
      <header className="header"><h1><span aria-hidden="true">🎶</span> abbey bookings 26/27</h1>{session && <div className="toolbar">
        <button className={mine ? 'icon active' : 'icon'} title="My bookings" aria-label="My bookings" aria-pressed={mine} onClick={() => setMine(!mine)}><UserRound size={21}/></button>
        <button className="icon" title="Search" aria-label="Search bookings" aria-expanded={searching} onClick={() => { setSearching(!searching); setSearch(''); }}><Search size={21}/></button>
        <button className="icon" title="Refresh" aria-label="Refresh calendar" disabled={loading} onClick={() => setRevision(v => v + 1)}><RefreshCw size={19} className={loading ? 'spin' : ''}/></button>
        <button className="primary" onClick={() => openForm()}>New <Plus size={19}/></button>
      </div>}</header>
      {!session ? <section className="welcome"><a className="primary" href="https://t.me/TheAbbeyBot">Open in Telegram</a><p>Abbey-licensed residents only.</p>{authError && <p className="error" role="alert">{authError}</p>}<button className="subtle" onClick={preview}>Preview</button></section> : <>
        {demo && <div className="preview"><span>Preview · sample bookings</span><button onClick={() => { setDemo(false); setSession(null); setBookings([]); setNotice(''); }}>Exit</button></div>}
        {searching && <BookingSearch onSearch={setSearch}/>}
        {notice && <div role="status" className="notice">{notice}<button aria-label="Dismiss" onClick={() => setNotice('')}><X size={16}/></button></div>}
        {error && !form && !selected && <p role="alert" className="error">{error}</p>}
        <div className="month-bar"><h2>{dateLabel(month,{ month:'long',year:'numeric' })}{mine && <span className="filter-label"> · My bookings</span>}</h2><div className="navigation"><button aria-label="Previous month" onClick={() => setMonth(shiftMonth(month,-1))}><ChevronLeft/></button><button onClick={() => setMonth(`${today().slice(0,7)}-01`)}>Today</button><button aria-label="Next month" onClick={() => setMonth(shiftMonth(month,1))}><ChevronRight/></button></div></div>
        <MonthlyCalendar month={month} bookings={visible} loading={loading} currentDay={today()} onBook={openForm} onSelect={selectBooking}/>
        {loading && <p role="status" className="loading">Loading…</p>}
      </>}
    </main>
    {(form || selected) && <div className="modal-backdrop"><section ref={dialog} className="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <div className="modal-heading"><h2 id="dialog-title">{form ? 'New booking' : selected?.resident_name || 'Booking'}</h2><button className="icon" aria-label="Close" disabled={busy} onClick={() => { setForm(null); setSelected(null); setError(''); }}><X size={22}/></button></div>
      {form && <form onSubmit={submit}><label>Name<input required maxLength={80} name="name" defaultValue={form.name}/></label><div className="form-row"><label>Date<input type="date" min={today()} required name="date" defaultValue={form.date}/></label><label>Start time (SGT)<select required name="time" defaultValue={form.time}>{halfHourTimes.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}</select></label></div><label>Duration (hours)<input type="number" min={0.5} max={24} step={0.5} required name="duration" defaultValue={form.duration / 60} inputMode="decimal"/></label><label>Purpose<textarea required maxLength={400} name="purpose" defaultValue={form.purpose}/></label><p className="hint">Confirmed after quartermaster approval. All times SGT.</p>{error && <p className="error" role="alert">{error}</p>}<button disabled={busy} className="primary full">{busy ? 'Sending…' : 'Request booking'}</button></form>}
      {selected && <><dl><dt>From</dt><dd>{dateLabel(selected.starts_at,{day:'numeric',month:'long',year:'numeric'})}, {clock(selected.starts_at)}</dd><dt>To</dt><dd>{dateLabel(selected.ends_at,{day:'numeric',month:'long',year:'numeric'})}, {clock(selected.ends_at)}</dd><dt>Status</dt><dd className="capitalize">{selected.status}</dd>{selected.purpose && <><dt>Purpose</dt><dd>{selected.purpose}</dd></>}</dl><p className="hint">Singapore time (SGT)</p>{error && <p className="error" role="alert">{error}</p>}{(selected.mine || session?.admin) && new Date(selected.starts_at).getTime() > Date.now() && <div className="cancel-row">{confirmCancel ? <><span>Cancel this booking?</span><button className="danger" disabled={busy} onClick={cancel}>Yes, cancel</button><button disabled={busy} onClick={() => setConfirmCancel(false)}>Keep</button></> : <button className="danger" onClick={() => setConfirmCancel(true)}>Cancel booking</button>}</div>}</>}
    </section></div>}
  </>;
}
