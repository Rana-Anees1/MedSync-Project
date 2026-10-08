import { useState } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useActions } from '../../context/hooks';
import { useToast } from '../../context/ToastContext';
import { OWNER_LABELS } from '../../config/constants';
import { PageHeader, Panel, Button, Input, Select, Field } from '../../components/ui';

const ownerOptions = Object.entries(OWNER_LABELS).map(([value, label]) => ({ value, label }));

export default function TemplatesPage() {
  const { state } = useStore();
  const actions = useActions();
  const { toast } = useToast();
  const [selected, setSelected] = useState(state.templates[0]?.id);
  const [draft, setDraft] = useState(() => (state.templates[0] ? structuredClone(state.templates[0]) : null));

  const pick = (id) => {
    setSelected(id);
    setDraft(structuredClone(state.templates.find((t) => t.id === id)));
  };
  const setItem = (i, k, v) => setDraft((d) => ({ ...d, items: d.items.map((it, j) => (j === i ? { ...it, [k]: v, ...(k === 'owner' ? { patientTask: v === 'patient' } : {}) } : it)) }));
  const addItem = () =>
    setDraft((d) => ({ ...d, items: [...d.items, { key: `custom_${Date.now()}`, title: 'New readiness item', titleUr: '', owner: 'patient', offsetDays: 3, mandatory: true, patientTask: true, dayOf: false, category: 'investigation', priority: 'medium', description: '' }] }));
  const removeItem = (i) => setDraft((d) => ({ ...d, items: d.items.filter((_, j) => j !== i) }));
  const save = () => {
    actions.saveTemplate(draft).then((ok) => ok && toast(`Template saved. New cases for ${draft.name} will use it.`));
  };

  if (!draft) return <PageHeader title="Procedure templates">No procedure templates exist yet. Run the seed script or create templates through the API.</PageHeader>;
  return (
    <>
      <PageHeader title="Procedure templates">Clinicians define what "ready" means for each operation. MedSync turns it into a plan with owners and deadlines.</PageHeader>
      <div className="grid grid--sidebar">
        <Panel title="Procedures" flush>
          <ul className="picker">
            {state.templates.map((t) => (
              <li key={t.id}>
                <button className={`picker__item ${selected === t.id ? 'is-on' : ''}`} onClick={() => pick(t.id)}>
                  <strong>{t.name}</strong>
                  <span>{t.items.length} items · {t.durationMin} min</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
        <div className="stack">
          <Panel title={draft.name} actions={<Button icon={Save} onClick={save}>Save template</Button>}>
            <div className="form-grid">
              <Field label="Procedure name" className="span-2">{(id) => <Input id={id} value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />}</Field>
              <Field label="Typical duration (min)">{(id) => <Input id={id} type="number" value={draft.durationMin} onChange={(e) => setDraft((d) => ({ ...d, durationMin: Number(e.target.value) }))} />}</Field>
            </div>
          </Panel>
          <Panel title="Readiness items" subtitle="Deadline = surgery date minus days before" actions={<Button variant="secondary" icon={Plus} onClick={addItem}>Add item</Button>} flush>
            <div className="table-wrap">
              <table className="table table--edit">
                <thead><tr><th>Item</th><th>Priority</th><th>Responsible</th><th>Days before</th><th>Required</th><th>Day of surgery</th><th><span className="sr-only">Remove</span></th></tr></thead>
                <tbody>
                  {draft.items.map((it, i) => (
                    <tr key={it.key}>
                      <td><Input aria-label="Item title" style={{ minWidth: 240 }} value={it.title} onChange={(e) => setItem(i, 'title', e.target.value)} /></td>
                      <td><Select aria-label="Priority" value={it.priority || 'medium'} onChange={(e) => setItem(i, 'priority', e.target.value)} options={['high', 'medium', 'low']} /></td>
                      <td><Select aria-label="Responsible" value={it.owner} onChange={(e) => setItem(i, 'owner', e.target.value)} options={ownerOptions} /></td>
                      <td><Input aria-label="Days before surgery" type="number" min="0" value={it.offsetDays} onChange={(e) => setItem(i, 'offsetDays', Number(e.target.value))} style={{ width: 80 }} /></td>
                      <td><input type="checkbox" aria-label="Required" checked={it.mandatory} onChange={(e) => setItem(i, 'mandatory', e.target.checked)} /></td>
                      <td><input type="checkbox" aria-label="Day of surgery" checked={it.dayOf} onChange={(e) => setItem(i, 'dayOf', e.target.checked)} /></td>
                      <td><button className="icon-btn" onClick={() => removeItem(i)} aria-label={`Remove ${it.title}`}><Trash2 size={16} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <Panel title="Condition-based items" subtitle="Added to any procedure when the patient has the condition">
            <ul className="plain-list">
              {state.rules.conditionalItems.map((r) => (
                <li key={r.when}><strong>{r.when}</strong>: {r.item.title} ({OWNER_LABELS[r.item.owner]}, {r.item.offsetDays} days before)</li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
