import { useEffect, useState } from 'react';
import { errMsg } from '../api/axios';
import { toNum } from '../utils/format';

// One input cell of the questionnaire (a value for one question in one school year).
// Saves itself when the user leaves the field, or immediately for dropdowns.
export default function AnswerCell({ question, answer, disabled, inschalingOptions, computedValue, hasExtra, onSave, onOpenDetails }) {
  const stored = answer?.value ?? '';
  const [val, setVal] = useState(stored);
  const [state, setState] = useState(''); // '' | 'saved' | 'error'
  const [err, setErr] = useState('');

  useEffect(() => { setVal(stored); }, [stored]);

  async function commit(next) {
    if (String(next) === String(stored)) return;
    try {
      await onSave({ value: next });
      setState('saved'); setErr('');
      setTimeout(() => setState(''), 1500);
    } catch (e) {
      setState('error'); setErr(errMsg(e, 'Opslaan mislukt'));
    }
  }

  const common = {
    disabled,
    className: state,
    title: err || undefined,
    'aria-label': question.text,
  };
  const t = question.answerType;

  let input;
  if (computedValue !== undefined) {
    input = <div className="cell-computed" title="Automatisch berekend">{computedValue === null ? '—' : computedValue}</div>;
  } else if (t === 'inschaling') {
    input = (
      <select {...common} value={val} onChange={(e) => { setVal(e.target.value); commit(e.target.value); }}>
        <option value="">—</option>
        {inschalingOptions.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
      </select>
    );
  } else if (t === 'text') {
    input = (
      <textarea {...common} rows={2} value={val} onChange={(e) => setVal(e.target.value)} onBlur={() => commit(val)} />
    );
  } else {
    const max = t === 'percentage' ? 100 : t === 'scale10' ? 10 : undefined;
    input = (
      <input
        {...common}
        type="number"
        inputMode="decimal"
        step={t === 'number' ? '1' : '0.1'}
        min={t === 'number' ? undefined : 0}
        max={max}
        value={val}
        placeholder={t === 'percentage' ? '%' : t === 'scale10' ? '/10' : ''}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => commit(val)}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      />
    );
  }

  return (
    <div className="cell-wrap">
      {input}
      {computedValue === undefined && (
        <button className="icon-btn" onClick={onOpenDetails} title="Opmerkingen, advies en bijlagen" aria-label="Opmerkingen en bijlagen">
          💬{hasExtra && <span className="dot" />}
        </button>
      )}
    </div>
  );
}

// client-side mirror of the server's sum logic for computed totals
export function sumFor(question, valueOf) {
  const parts = (question.sumOf || []).map((k) => toNum(valueOf(k))).filter((n) => n !== null);
  return parts.length ? parts.reduce((a, b) => a + b, 0) : null;
}
