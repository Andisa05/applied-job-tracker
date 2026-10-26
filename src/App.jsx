import { useEffect, useMemo, useState, useCallback } from 'react';
import { App as CapApp } from '@capacitor/app';
import { loadState, saveState, newId, exportBackup, parseBackup } from './storage';
import { startAds, maybeShowInterstitial, canShowPrivacyOptions, showPrivacyOptions, hideBanner, resumeBanner } from './ads';
import { scheduleFollowUp, cancelFollowUp } from './reminders';
import { TIPS } from './tips';
import { INTERSTITIAL_EVERY, PRIVACY_URL, CONTACT_EMAIL } from './config';

export const STATUSES = ['Applied', 'Interview', 'Offer', 'Rejected', 'No reply'];
const SOURCES = ['LinkedIn', 'PNet', 'Careers24', 'Indeed', 'Company website', 'Referral', 'Gov vacancy', 'Other'];

const localIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => localIso(new Date());
const addDays = (iso, n) => {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return localIso(d);
};
const fmt = (iso) =>
  iso ? new Date(iso + 'T12:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) : '';
const daysSince = (iso) => Math.floor((Date.now() - new Date(iso + 'T12:00:00')) / 86400000);

export default function App() {
  const [state, setState] = useState(null);
  const [tab, setTab] = useState('home');
  const [editing, setEditing] = useState(null); // application object or {} for new
  const [bannerH, setBannerH] = useState(0);

  useEffect(() => {
    loadState().then(setState);
    const t = setTimeout(() => startAds(setBannerH), 800);
    return () => clearTimeout(t);
  }, []);

  // Android back button closes the form, then goes home, then exits.
  useEffect(() => {
    const sub = CapApp.addListener('backButton', () => {
      if (editing) setEditing(null);
      else if (tab !== 'home') setTab('home');
      else CapApp.exitApp();
    });
    return () => { sub.then((s) => s.remove()); };
  }, [editing, tab]);

  useEffect(() => {
    if (editing) hideBanner(); else resumeBanner();
  }, [editing]);

  const commit = useCallback((next) => {
    setState(next);
    saveState(next);
  }, []);

  const upsert = async (app) => {
    const isNew = !state.applications.some((a) => a.id === app.id);
    const applications = isNew
      ? [app, ...state.applications]
      : state.applications.map((a) => (a.id === app.id ? app : a));
    const createdCount = state.createdCount + (isNew ? 1 : 0);
    commit({ ...state, applications, createdCount });
    setEditing(null);
    scheduleFollowUp(app);
    if (isNew && createdCount > 1 && createdCount % INTERSTITIAL_EVERY === 0) maybeShowInterstitial();
  };

  const remove = (id) => {
    cancelFollowUp(id);
    commit({ ...state, applications: state.applications.filter((a) => a.id !== id) });
    setEditing(null);
  };

  if (!state) return <div className="splash">Applied</div>;

  return (
    <div className="app" style={{ paddingBottom: 80 + bannerH, '--banner': bannerH + 'px' }}>
      <header className="top">
        <h1>Applied<span>.</span></h1>
        <p>Your job hunt, in one place</p>
      </header>

      <main>
        {tab === 'home' && <Home apps={state.applications} onOpen={setEditing} onAdd={() => setEditing({})} onGo={setTab} />}
        {tab === 'list' && <List apps={state.applications} onOpen={setEditing} onAdd={() => setEditing({})} />}
        {tab === 'tips' && <Tips />}
        {tab === 'more' && <More state={state} commit={commit} />}
      </main>

      <nav className="tabs" style={{ bottom: bannerH }}>
        {[
          ['home', '🏠', 'Home'],
          ['list', '📋', 'Jobs'],
          ['tips', '💡', 'Tips'],
          ['more', '⚙️', 'More'],
        ].map(([k, i, l]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            <span>{i}</span>{l}
          </button>
        ))}
      </nav>

      {editing && <Editor initial={editing} onSave={upsert} onDelete={remove} onClose={() => setEditing(null)} />}
    </div>
  );
}

function Home({ apps, onOpen, onAdd, onGo }) {
  const stats = useMemo(() => {
    const count = (s) => apps.filter((a) => a.status === s).length;
    const week = apps.filter((a) => a.applied && daysSince(a.applied) < 7).length;
    const responded = apps.filter((a) => ['Interview', 'Offer', 'Rejected'].includes(a.status)).length;
    return {
      total: apps.length,
      interviews: count('Interview'),
      offers: count('Offer'),
      week,
      rate: apps.length ? Math.round((responded / apps.length) * 100) : 0,
    };
  }, [apps]);

  const due = apps
    .filter((a) => a.followUp && a.followUp <= addDays(today(), 2) && !['Offer', 'Rejected'].includes(a.status))
    .sort((a, b) => a.followUp.localeCompare(b.followUp));
  const upcoming = apps
    .filter((a) => a.status === 'Interview' && a.interviewDate && a.interviewDate >= today())
    .sort((a, b) => a.interviewDate.localeCompare(b.interviewDate));

  if (!apps.length) {
    return (
      <section className="empty">
        <div className="big">🎯</div>
        <h2>Track every application</h2>
        <p>Add the jobs you apply for, set follow-up reminders and see your progress. Everything stays on your phone.</p>
        <button className="primary" onClick={onAdd}>Add your first application</button>
        <button className="ghost" onClick={() => onGo('tips')}>Read CV &amp; interview tips</button>
      </section>
    );
  }

  return (
    <section>
      <div className="stats">
        <Stat n={stats.total} l="Applied" />
        <Stat n={stats.interviews} l="Interviews" />
        <Stat n={stats.offers} l="Offers" />
        <Stat n={stats.rate + '%'} l="Response rate" />
      </div>
      <p className="week">{stats.week} application{stats.week === 1 ? '' : 's'} this week {stats.week >= 10 ? '🔥' : stats.week >= 5 ? '👏' : ''}</p>

      {upcoming.length > 0 && (
        <>
          <h3>Upcoming interviews</h3>
          {upcoming.map((a) => <Row key={a.id} a={a} onOpen={onOpen} note={`Interview ${fmt(a.interviewDate)}`} />)}
        </>
      )}

      <h3>Follow up soon</h3>
      {due.length ? (
        due.map((a) => <Row key={a.id} a={a} onOpen={onOpen} note={a.followUp < today() ? `Overdue since ${fmt(a.followUp)}` : `Follow up ${fmt(a.followUp)}`} />)
      ) : (
        <p className="muted">Nothing due in the next two days.</p>
      )}

      <button className="fab" onClick={onAdd} aria-label="Add application">＋</button>
    </section>
  );
}

const Stat = ({ n, l }) => (
  <div className="stat"><b>{n}</b><span>{l}</span></div>
);

function Row({ a, onOpen, note }) {
  return (
    <button className="row" onClick={() => onOpen(a)}>
      <div>
        <b>{a.role || 'Untitled role'}</b>
        <span>{a.company}{note ? ` · ${note}` : a.applied ? ` · ${fmt(a.applied)}` : ''}</span>
      </div>
      <i className={'pill s-' + a.status.replace(/\s/g, '')}>{a.status}</i>
    </button>
  );
}

function List({ apps, onOpen, onAdd }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('All');
  const shown = apps
    .filter((a) => filter === 'All' || a.status === filter)
    .filter((a) => !q || `${a.company} ${a.role}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (b.applied || '').localeCompare(a.applied || ''));
  return (
    <section>
      <input className="search" placeholder="Search company or role" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="chips">
        {['All', ...STATUSES].map((s) => (
          <button key={s} className={filter === s ? 'on' : ''} onClick={() => setFilter(s)}>
            {s} {s === 'All' ? apps.length : apps.filter((a) => a.status === s).length}
          </button>
        ))}
      </div>
      {shown.length ? shown.map((a) => <Row key={a.id} a={a} onOpen={onOpen} />) : <p className="muted">No applications here yet.</p>}
      <button className="fab" onClick={onAdd} aria-label="Add application">＋</button>
    </section>
  );
}

function Editor({ initial, onSave, onDelete, onClose }) {
  const isNew = !initial.id;
  const [f, setF] = useState(() => ({
    id: initial.id || newId(),
    company: '', role: '', status: 'Applied', source: 'LinkedIn', applied: today(),
    followUp: isNew ? addDays(today(), 10) : '', interviewDate: '', salary: '', link: '', contact: '', notes: '',
    ...initial,
  }));
  const [confirm, setConfirm] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const valid = f.company.trim() && f.role.trim();

  return (
    <div className="sheet-bg" onClick={onClose}>
      <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); if (valid) onSave({ ...f, company: f.company.trim(), role: f.role.trim() }); }}>
        <div className="sheet-head">
          <button type="button" className="link" onClick={onClose}>Cancel</button>
          <b>{isNew ? 'New application' : 'Edit application'}</b>
          <button type="submit" className="link strong" disabled={!valid}>Save</button>
        </div>
        <label>Job title *<input value={f.role} onChange={set('role')} placeholder="e.g. Junior Developer" autoFocus={isNew} /></label>
        <label>Company *<input value={f.company} onChange={set('company')} placeholder="e.g. Standard Bank" /></label>
        <div className="seg">
          {STATUSES.map((s) => (
            <button type="button" key={s} className={f.status === s ? 'on' : ''} onClick={() => setF({ ...f, status: s })}>{s}</button>
          ))}
        </div>
        <div className="two">
          <label>Date applied<input type="date" value={f.applied} onChange={set('applied')} /></label>
          <label>Follow up on<input type="date" value={f.followUp} onChange={set('followUp')} /></label>
        </div>
        {f.status === 'Interview' && (
          <label>Interview date<input type="date" value={f.interviewDate} onChange={set('interviewDate')} /></label>
        )}
        <label>Where you found it
          <select value={f.source} onChange={set('source')}>{SOURCES.map((s) => <option key={s}>{s}</option>)}</select>
        </label>
        <label>Salary / range<input value={f.salary} onChange={set('salary')} placeholder="e.g. R18 000 – R22 000" /></label>
        <label>Job advert link<input value={f.link} onChange={set('link')} placeholder="https://" inputMode="url" /></label>
        <label>Contact person<input value={f.contact} onChange={set('contact')} placeholder="Name, email or phone" /></label>
        <label>Notes<textarea rows={4} value={f.notes} onChange={set('notes')} placeholder="Interview questions, who you spoke to, next steps…" /></label>
        {f.followUp && <p className="muted small">You'll get a reminder at 09:00 on {fmt(f.followUp)}.</p>}
        {!isNew && (
          confirm ? (
            <div className="confirm">
              <span>Delete this application?</span>
              <button type="button" className="danger" onClick={() => onDelete(f.id)}>Delete</button>
              <button type="button" className="ghost" onClick={() => setConfirm(false)}>Keep</button>
            </div>
          ) : (
            <button type="button" className="ghost danger-text" onClick={() => setConfirm(true)}>Delete application</button>
          )
        )}
      </form>
    </div>
  );
}

function Tips() {
  const [open, setOpen] = useState('cv');
  return (
    <section>
      <h2 className="h2">Tips that get interviews</h2>
      {TIPS.map((t) => (
        <div key={t.id} className={'acc' + (open === t.id ? ' open' : '')}>
          <button onClick={() => setOpen(open === t.id ? null : t.id)}>
            <span>{t.icon}</span>{t.title}<i>{open === t.id ? '–' : '+'}</i>
          </button>
          {open === t.id && (
            <div className="acc-body">
              {t.items.map(([h, p]) => (
                <div key={h} className="tip"><b>{h}</b><p>{p}</p></div>
              ))}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}

function More({ state, commit }) {
  const [msg, setMsg] = useState('');
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const backup = exportBackup(state);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(backup);
      setMsg('Backup copied. Paste it somewhere safe, like an email to yourself.');
    } catch {
      setMsg('Could not copy automatically. Select the text below and copy it.');
    }
  };
  const doImport = () => {
    try {
      const apps = parseBackup(importText);
      const ids = new Set(state.applications.map((a) => a.id));
      const merged = [...apps.filter((a) => !ids.has(a.id)), ...state.applications];
      commit({ ...state, applications: merged });
      setMsg(`Imported ${merged.length - state.applications.length} application(s).`);
      setShowImport(false);
      setImportText('');
    } catch (e) {
      setMsg(e.message || 'That backup could not be read.');
    }
  };

  return (
    <section className="more">
      <h2 className="h2">Backup</h2>
      <p className="muted">Your data is stored only on this phone. Copy a backup before changing phones.</p>
      <button className="primary" onClick={copy}>Copy backup</button>
      <button className="ghost" onClick={() => setShowImport(!showImport)}>Restore from backup</button>
      {showImport && (
        <>
          <textarea rows={5} className="mono" placeholder="Paste your backup here" value={importText} onChange={(e) => setImportText(e.target.value)} />
          <button className="primary" disabled={!importText.trim()} onClick={doImport}>Restore</button>
        </>
      )}
      {msg && <p className="note">{msg}</p>}

      <h2 className="h2">About</h2>
      <p className="muted">Applied is free and supported by ads. Made in South Africa by Andisa Mtshali.</p>
      {canShowPrivacyOptions() && <button className="ghost" onClick={showPrivacyOptions}>Ad privacy choices</button>}
      <a className="ghost btnlink" href={PRIVACY_URL} target="_blank" rel="noreferrer">Privacy policy</a>
      <a className="ghost btnlink" href={`mailto:${CONTACT_EMAIL}?subject=Applied app feedback`}>Send feedback</a>
      <p className="muted small">Version 1.0.0</p>
    </section>
  );
}
