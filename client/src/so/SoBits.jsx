import { useState } from 'react';
import Modal from '../components/Modal';
import { ErrorBanner } from '../components/Bits';
import { INSCHALING_SO, inschalingSO, PLAN_MONTHS, monthLabel, soSourceLabel } from '../utils/constants';

export function InschalingPill({ value }) {
  const i = inschalingSO(value);
  return i ? <span className={`status-pill ${i.cls}`}>{i.label}</span> : <span className="status-pill none">Nog niet ingeschaald</span>;
}

export function InschalingSelect({ value, onChange, disabled }) {
  const i = inschalingSO(value);
  return (
    <select className={`status-select ${i ? i.cls : 'none'}`} value={value ?? ''} disabled={disabled}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} aria-label="Inschaling">
      <option value="">? niet ingeschaald</option>
      {INSCHALING_SO.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function RokTags({ codes, rokByCode }) {
  return codes.map((c) => <span className="tag" key={c} title={rokByCode?.[c]?.title}>{c}</span>);
}

// Edit one indicator's inschaling, monitoring month, own threshold and action for the active school year
export function IndicatorModal({ row, rokByCode, error, onClose, onSave }) {
  const [f, setF] = useState({ inschaling: row.inschaling, month: row.month, threshold: row.ownThreshold, action: row.action });
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    // A month equal to the template's default is stored as '' so it keeps following the template
    const ok = await onSave(row.key, { ...f, month: f.month === row.defaultMonth ? '' : f.month });
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <Modal title={row.text} onClose={onClose} wide>
      <ErrorBanner message={error} />
      <p className="muted" style={{ marginTop: 0 }}>
        {soSourceLabel(row.source)}{row.group && ` › ${row.group}`} · bron: {row.bron || '—'}
      </p>
      {row.rok.length > 0 && (
        <div className="so-rok-links">
          {row.rok.map((c) => <div key={c}><span className="tag">{c}</span> {rokByCode[c]?.title}</div>)}
        </div>
      )}
      <form onSubmit={submit}>
        <div className="field-row">
          <div className="field"><label>Inschaling</label>
            <InschalingSelect value={f.inschaling} onChange={(v) => setF({ ...f, inschaling: v })} />
          </div>
          <div className="field"><label>Monitoringsmoment</label>
            <select value={f.month || ''} onChange={(e) => setF({ ...f, month: e.target.value })}>
              <option value="">Geen maand</option>
              {PLAN_MONTHS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
            {row.defaultMonth && row.defaultMonth !== f.month && <div className="hint">Standaard: {monthLabel(row.defaultMonth)}</div>}
          </div>
        </div>
        <div className="field"><label>Drempelwaarde van de school</label>
          <input value={f.threshold} placeholder={row.defaultThreshold || 'Geen drempelwaarde'}
            onChange={(e) => setF({ ...f, threshold: e.target.value })} />
          <div className="hint">Leeg laten = standaard drempelwaarde{row.defaultThreshold ? `: ${row.defaultThreshold}` : ''}.</div>
        </div>
        <div className="field"><label>Opmerking / actie</label>
          <textarea rows={3} value={f.action} onChange={(e) => setF({ ...f, action: e.target.value })} />
        </div>
        <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Bezig…' : 'Opslaan'}</button>
      </form>
    </Modal>
  );
}
