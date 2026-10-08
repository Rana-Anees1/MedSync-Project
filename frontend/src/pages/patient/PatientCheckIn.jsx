import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Siren, BellRing, CheckCircle2, Camera, PhoneCall } from 'lucide-react';
import { useActions } from '../../context/hooks';
import { WOUND_OPTIONS } from '../../services/recoveryScoring';
import { EmptyState } from '../../components/ui';
import LangToggle from './LangToggle';
import { usePatientCase } from './usePatientCase';

const START = { generalStatus: 'same', symptoms: [], temp: '37.0', pain: 3, wound: 'normal', eating: 'normal', mobility: 'limited', drain: '', bleeding: false, breathless: false, photo: false, photoName: '', notes: '' };

function Choice({ name, value, options, onChange }) {
  return (
    <div className="p-choices" role="radiogroup">
      {options.map((o) => (
        <label key={o.value} className={`p-choice ${value === o.value ? 'is-on' : ''}`}>
          <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  );
}

export default function PatientCheckIn() {
  const { c, lang, setLang, t, today } = usePatientCase();
  const actions = useActions();
  const [f, setF] = useState(START);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const yesNo = [{ value: true, label: t.yes }, { value: false, label: t.no }];

  if (!c || !['DISCHARGED', 'RECOVERY'].includes(c.status)) {
    return (
      <div className="patient" dir={t.dir} lang={lang}>
        <div className="patient__bar"><span /><LangToggle lang={lang} setLang={setLang} t={t} /></div>
        <EmptyState title={t.ciTitle}>{t.notMonitoring}</EmptyState>
      </div>
    );
  }

  if (result) {
    const kind = result.redFlag ? 'emergency' : result.alertType ? 'alert' : 'ok';
    const Icon = kind === 'emergency' ? Siren : kind === 'alert' ? BellRing : CheckCircle2;
    return (
      <div className="patient" dir={t.dir} lang={lang}>
        <section className={`p-result p-result--${kind}`} role="alert">
          <Icon size={40} aria-hidden />
          <h1>{kind === 'emergency' ? t.emergencyTitle : kind === 'alert' ? t.alertTitle : t.okTitle}</h1>
          <p>{kind === 'emergency' ? t.emergencyBody : kind === 'alert' ? t.alertBody : t.okBody}</p>
          <p className="small">{t.disclaimer}</p>
          {kind === 'emergency' && (
            <a href="tel:1122" className="btn btn--danger btn--lg"><PhoneCall size={18} aria-hidden /><span>1122</span></a>
          )}
          <Link to="/my" className="btn btn--ghost">{t.backHome}</Link>
        </section>
      </div>
    );
  }

  const already = c.checkins.some((ci) => ci.date === today);

  const submit = async (e) => {
    e.preventDefault();
    const { photoName, photo, ...data } = f;
    setBusy(true);
    const res = await actions.submitCheckin(c.id, { ...data, temp: Number(f.temp), pain: Number(f.pain) }, photoFile);
    setBusy(false);
    if (res) { setResult(res); window.scrollTo({ top: 0 }); }
  };

  return (
    <div className="patient" dir={t.dir} lang={lang}>
      <div className="patient__bar">
        <h1 className="patient__title">{t.ciTitle}</h1>
        <LangToggle lang={lang} setLang={setLang} t={t} />
      </div>
      <p className="muted">{t.ciIntro}</p>
      {already && <p className="callout">{t.checkinDone}</p>}

      <p className="callout callout--info">{t.disclaimer}</p>
      <form className="p-form" onSubmit={submit}>
        <fieldset>
          <legend>{t.general}</legend>
          <Choice name="generalStatus" value={f.generalStatus} onChange={set('generalStatus')} options={[{ value: 'better', label: t.better }, { value: 'same', label: t.same }, { value: 'worse', label: t.worse }]} />
        </fieldset>
        <fieldset>
          <legend>{t.symptomsLabel}</legend>
          <div className="p-choices">
            {Object.entries(t.symptoms).map(([k, label]) => (
              <label key={k} className={`p-choice ${f.symptoms.includes(k) ? 'is-on' : ''}`}>
                <input type="checkbox" checked={f.symptoms.includes(k)} onChange={() => setF((x) => ({ ...x, symptoms: x.symptoms.includes(k) ? x.symptoms.filter((y) => y !== k) : [...x.symptoms, k] }))} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>{t.temp}</legend>
          <input className="input input--big" type="number" step="0.1" min="34" max="42" value={f.temp} onChange={(e) => set('temp')(e.target.value)} aria-label={t.temp} />
        </fieldset>

        <fieldset>
          <legend>{t.pain}</legend>
          <div className="p-pain">
            <input type="range" min="0" max="10" value={f.pain} onChange={(e) => set('pain')(Number(e.target.value))} aria-label={t.pain} />
            <output className={`p-pain__value ${f.pain >= 7 ? 'is-bad' : f.pain >= 4 ? 'is-warn' : ''}`}>{f.pain}</output>
          </div>
          <p className="field__hint">{t.painHint}</p>
        </fieldset>

        <fieldset>
          <legend>{t.wound}</legend>
          <Choice name="wound" value={f.wound} onChange={set('wound')} options={WOUND_OPTIONS.map((w) => ({ value: w.value, label: lang === 'ur' ? w.ur : w.label }))} />
          <label className="btn btn--ghost p-photo">
            <Camera size={17} aria-hidden />
            <span>{f.photoName || t.photo}</span>
            <input type="file" accept="image/*" hidden onChange={(e) => { const n = e.target.files?.[0]?.name; if (n) { setPhotoFile(e.target.files[0]); setF((x) => ({ ...x, photo: true, photoName: n })); } }} />
          </label>
        </fieldset>

        <fieldset>
          <legend>{t.eating}</legend>
          <Choice name="eating" value={f.eating} onChange={set('eating')} options={[{ value: 'normal', label: t.eatNormal }, { value: 'reduced', label: t.eatReduced }, { value: 'none', label: t.eatNone }]} />
        </fieldset>

        <fieldset>
          <legend>{t.mobility}</legend>
          <Choice name="mobility" value={f.mobility} onChange={set('mobility')} options={[{ value: 'normal', label: t.mobNormal }, { value: 'limited', label: t.mobLimited }, { value: 'bedbound', label: t.mobBed }]} />
        </fieldset>

        <fieldset>
          <legend>{t.bleeding}</legend>
          <Choice name="bleeding" value={f.bleeding} onChange={set('bleeding')} options={yesNo} />
        </fieldset>

        <fieldset>
          <legend>{t.breathless}</legend>
          <Choice name="breathless" value={f.breathless} onChange={set('breathless')} options={yesNo} />
        </fieldset>

        <fieldset>
          <legend>{t.notes}</legend>
          <textarea className="input input--area" rows={3} value={f.notes} onChange={(e) => set('notes')(e.target.value)} aria-label={t.notes} />
        </fieldset>

        <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={busy}>{busy ? t.sending : t.submit}</button>
      </form>
    </div>
  );
}
