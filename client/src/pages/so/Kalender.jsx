import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { NoSchool, ErrorBanner } from '../../components/Bits';
import { useSo } from '../../so/useSo';
import { InschalingSelect, IndicatorModal, RokTags } from '../../so/SoBits';
import { PLAN_MONTHS, soSourceLabel } from '../../utils/constants';

// SO: the monitoring calendar. Built from all indicators, so each indicator appears exactly once,
// in the month it is monitored (the school's own month, or the template's).
export default function Kalender() {
  const { schoolId, school, year } = useApp();
  const { rok, rows, loading, error, save } = useSo();
  const [edit, setEdit] = useState(null);
  const [onlyRok, setOnlyRok] = useState(true);
  const rokByCode = useMemo(() => Object.fromEntries(rok.map((r) => [r.code, r])), [rok]);

  const months = useMemo(() => {
    const list = rows.filter((r) => !onlyRok || r.rok.length);
    const out = PLAN_MONTHS.map((m) => ({ ...m, rows: list.filter((r) => r.month === m.key) }));
    out.push({ key: '', label: 'Zonder monitoringsmoment', rows: list.filter((r) => !r.month) });
    return out.filter((m) => m.rows.length);
  }, [rows, onlyRok]);

  if (!schoolId) return <NoSchool />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Monitoringskalender</h1>
          <p>Wanneer komt welke indicator aan bod bij {school?.name} in {year}? Wijzig het moment per indicator via Indicatoren.</p>
        </div>
      </div>
      <ErrorBanner message={error} />
      <div className="toolbar">
        <label className="checkbox-row" style={{ margin: 0 }}>
          <input type="checkbox" checked={onlyRok} onChange={(e) => setOnlyRok(e.target.checked)} /> Enkel indicatoren uit het kwaliteitsbeeld
        </label>
      </div>

      {loading ? <p className="muted">Laden…</p> : months.map((m) => (
        <section key={m.key || 'none'} className="card so-month">
          <h2>{m.label} <small className="muted">{m.rows.length}</small></h2>
          <table className="so-table">
            <tbody>
              {m.rows.map((r) => (
                <tr key={r.key}>
                  <td style={{ width: '22%' }}><span className="muted">{soSourceLabel(r.source)}</span><div>{r.bron}</div></td>
                  <td><button className="link-btn strong" onClick={() => setEdit(r)}>{r.text}</button><div className="muted">{r.threshold}</div></td>
                  <td style={{ width: 120 }}><RokTags codes={r.rok} rokByCode={rokByCode} /></td>
                  <td style={{ width: 170 }}><InschalingSelect value={r.inschaling} onChange={(v) => save(r.key, { inschaling: v })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      {edit && <IndicatorModal row={edit} rokByCode={rokByCode} error={error} onClose={() => setEdit(null)} onSave={save} />}
    </div>
  );
}
