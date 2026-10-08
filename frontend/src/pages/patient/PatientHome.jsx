import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, Upload, AlertTriangle, HeartPulse, Send, Stethoscope, CalendarHeart } from 'lucide-react';
import { useActions } from '../../context/hooks';
import { useToast } from '../../context/ToastContext';
import { diffDays, formatDate } from '../../utils/date';
import { readinessSummary } from '../../services/workflow';
import { Meter, EmptyState } from '../../components/ui';
import LangToggle from './LangToggle';
import { usePatientCase } from './usePatientCase';
import { IMAGES } from '../../assets/images';

export default function PatientHome() {
  const { patient, c, today, users, lang, setLang, t } = usePatientCase();

  return (
    <div className={`patient patient--${lang}`} dir={t.dir} lang={lang}>
      <div className="patient__bar">
        <span className="patient__hello">{lang === 'ur' ? `السلام علیکم، ${patient.name}` : `Assalam-o-Alaikum, ${patient.name}`}</span>
        <LangToggle lang={lang} setLang={setLang} t={t} />
      </div>
      {!c && <EmptyState title={t.noCase} />}
      {c && ['LISTED', 'PREPARATION', 'READY', 'SCHEDULED'].includes(c.status) && <Preparation c={c} today={today} t={t} lang={lang} />}
      {c && ['COMPLETED', 'DISCHARGED', 'RECOVERY'].includes(c.status) && <Recovery c={c} today={today} t={t} lang={lang} />}
      {c && c.status === 'CANCELLED' && <Notice icon={AlertTriangle} title={t.cancelled} body={c.cancellation?.reason} />}
      {c && c.status === 'DEFERRED' && <Notice icon={CalendarHeart} title={t.deferred} body={`${c.deferral?.reason} ${formatDate(c.deferral?.newDate)}`} />}
      {c && c.status === 'RECOVERED' && <Notice icon={CheckCircle2} title={t.recovered} tone="ok" />}
      {c && <Messages c={c} users={users} t={t} />}
    </div>
  );
}

function Notice({ icon: Icon, title, body, tone = 'warn' }) {
  return (
    <section className={`p-card p-card--${tone}`}>
      <Icon size={22} aria-hidden />
      <h2>{title}</h2>
      {body && <p>{body}</p>}
    </section>
  );
}

function Preparation({ c, today, t, lang }) {
  const actions = useActions();
  const { toast } = useToast();
  const days = diffDays(c.surgeryDate, today);
  const s = readinessSummary(c);
  const mine = c.items.filter((i) => i.patientTask);
  const team = c.items.filter((i) => !i.patientTask);
  const title = (it) => (lang === 'ur' ? it.titleUr || it.title : it.title);

  return (
    <>
      <section className="p-hero p-hero--image">
        <img className="p-hero__img" src={IMAGES.patientConsultation} alt="" />
        <p className="p-hero__label">{t.yourOperation}</p>
        <h1>{t.daysToGo(Math.max(days, 0))}</h1>
        <p className="p-hero__meta">{c.procedureName} · {formatDate(c.surgeryDate, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <Meter value={s.pct} label={t.stepsDone(s.done, s.total)} />
        <p className="p-hero__progress">{t.stepsDone(s.done, s.total)}</p>
      </section>

      {days <= 3 && days >= 0 && (
        <section className="p-card p-card--brand">
          <h2>{t.confirmTitle}</h2>
          {c.confirmations?.patient ? (
            <p><CheckCircle2 size={18} aria-hidden /> {t.confirmed(formatDate(c.confirmations.patient))}</p>
          ) : (
            <>
              <p>{t.confirmBody}</p>
              <button className="btn btn--primary btn--lg" onClick={() => { actions.patientConfirmAttendance(c.id).then((ok) => ok && toast(lang === 'ur' ? 'تصدیق ہو گئی' : 'Thank you for confirming.')); }}>{t.confirmBtn}</button>
            </>
          )}
        </section>
      )}

      {days <= 1 && days >= 0 && (
        <section className="info-card">
          <img src={IMAGES.wardCorridor} alt="" />
          <div><h2>{t.dayTitle}</h2><p>{t.dayBody}</p></div>
        </section>
      )}
      {c.items.some((i) => i.key === 'medhold') && (
        <section className="info-card">
          <img src={IMAGES.pharmacy} alt="" />
          <div><h2>{t.medicinesTitle}</h2><p>{t.medicinesBody}</p></div>
        </section>
      )}
      <section className="p-section">
        <h2>{t.yourTasks}</h2>
        <ul className="p-tasks">
          {mine.map((it) => <PatientTask key={it.id} c={c} it={it} today={today} t={t} title={title(it)} />)}
        </ul>
      </section>

      <section className="p-section">
        <h2>{t.teamTasks}</h2>
        <ul className="p-team">
          {team.map((it) => (
            <li key={it.id}>
              {['completed', 'not_required'].includes(it.status) ? <CheckCircle2 size={18} className="text-ok" aria-hidden /> : <Stethoscope size={18} aria-hidden />}
              <span>{title(it)}</span>
              <small>{['completed', 'not_required'].includes(it.status) ? t.done : formatDate(it.deadline)}</small>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function PatientTask({ c, it, today, t, title }) {
  const actions = useActions();
  const { toast } = useToast();
  const fileRef = useRef(null);
  const left = diffDays(it.deadline, today);
  const closed = ['completed', 'not_required'].includes(it.status);

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    actions.patientCompleteTask(c.id, it.id, f).then((ok) => ok && toast(t.submitted));
  };
  const confirm = () => {
    actions.patientCompleteTask(c.id, it.id).then((ok) => ok && toast(it.category === 'blood' ? t.submitted : t.done));
  };

  return (
    <li className={`p-task p-task--${it.status}`}>
      <span className="p-task__icon" aria-hidden>
        {closed ? <CheckCircle2 size={22} /> : it.status === 'in_progress' ? <Clock size={22} /> : it.status === 'overdue' ? <AlertTriangle size={22} /> : <span className="p-task__ring" />}
      </span>
      <div className="p-task__body">
        <strong>{title}</strong>
        <span>
          {closed ? t.done : it.status === 'in_progress' ? t.submitted : it.status === 'overdue' ? t.lateBy(-left) : t.dueOn(formatDate(it.deadline))}
        </span>
        {it.note && it.note.startsWith('Returned') && <span className="text-bad">{it.note}</span>}
      </div>
      {!closed && it.status !== 'in_progress' && (
        it.category === 'investigation' ? (
          <>
            <input ref={fileRef} type="file" accept="image/*,.pdf" hidden onChange={onFile} />
            <button className="btn btn--primary" onClick={() => fileRef.current?.click()}><Upload size={17} aria-hidden /><span>{t.upload}</span></button>
          </>
        ) : (
          <button className="btn btn--primary" onClick={confirm}><CheckCircle2 size={17} aria-hidden /><span>{it.category === 'blood' ? t.arranged : t.understood}</span></button>
        )
      )}
    </li>
  );
}

function Recovery({ c, today, t }) {
  if (!c.discharge) {
    return <Notice icon={HeartPulse} title={t.recoveryTitle} body={t.notMonitoring} tone="brand" />;
  }
  const day = diffDays(today, c.discharge.date);
  const doneToday = c.checkins.some((ci) => ci.date === today);
  const recalled = c.alerts.filter((a) => a.status === 'recalled').at(-1);

  return (
    <>
      {recalled && (
        <section className="p-card p-card--bad">
          <AlertTriangle size={22} aria-hidden />
          <h2>{t.recalled}</h2>
          <p>{recalled.response}</p>
        </section>
      )}
      <section className="p-hero p-hero--image">
        <img className="p-hero__img" src={IMAGES.recoveryRoom} alt="" />
        <p className="p-hero__label">{t.recoveryTitle}</p>
        <h1>{t.recoveryDay(Math.min(day, c.discharge.plan.days), c.discharge.plan.days)}</h1>
        <p className="p-hero__meta">{c.procedureName}</p>
        <div className="p-hero__cta">
          {doneToday ? (
            <p><CheckCircle2 size={18} aria-hidden /> {t.checkinDone}</p>
          ) : (
            <>
              <p>{t.checkinDue}</p>
              <Link to="/my/checkin" className="btn btn--primary btn--lg"><HeartPulse size={18} aria-hidden /><span>{t.startCheckin}</span></Link>
            </>
          )}
        </div>
      </section>
      <section className="p-section">
        <h2>{t.history}</h2>
        <ul className="p-history">
          {[...c.checkins].reverse().map((ci) => (
            <li key={ci.id}>
              <span>{formatDate(ci.date)}</span>
              <span>{ci.temp}°C</span>
              <span>{ci.pain}/10</span>
              <span className={`p-history__dot ${ci.redFlag || ci.score >= c.discharge.plan.threshold ? 'is-bad' : ''}`} aria-hidden />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function Messages({ c, users, t }) {
  const actions = useActions();
  const [text, setText] = useState('');
  const send = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    actions.sendMessage(c.id, text.trim());
    setText('');
  };
  return (
    <section className="p-section">
      <h2>{t.messages}</h2>
      {c.messages.length === 0 && <p className="muted">{t.noMessages}</p>}
      <ul className="p-messages">
        {[...c.messages].reverse().map((m) => {
          const u = users.find((x) => x.id === m.from);
          return (
            <li key={m.id} className={u?.role === 'patient' ? 'is-mine' : ''}>
              <small>{u?.name} · {formatDate(m.date)}</small>
              <p dir="auto">{m.text}</p>
            </li>
          );
        })}
      </ul>
      <form className="thread__form" onSubmit={send}>
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder={t.reply} aria-label={t.reply} />
        <button className="btn btn--primary" type="submit" disabled={!text.trim()}><Send size={16} aria-hidden /><span>{t.send}</span></button>
      </form>
    </section>
  );
}
