import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { errMsg } from '../api/axios';
import { useApp } from '../context/AppContext';
import { NoSchool, ErrorBanner } from '../components/Bits';
import AnswerCell, { sumFor } from '../components/AnswerCell';
import AnswerModal from '../components/AnswerModal';
import { MONTHS, shiftYear } from '../utils/constants';

export default function Vragenlijst() {
  const { schoolId, year, refList } = useApp();
  const [params, setParams] = useSearchParams();
  const month = params.get('maand') || 'september';

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // `${year}|${key}` -> answer
  const [attachments, setAttachments] = useState({}); // same key -> count
  const [progress, setProgress] = useState(null);
  const [editPast, setEditPast] = useState(false);
  const [detail, setDetail] = useState(null); // { question, year }
  const [error, setError] = useState('');

  // Like the Excel: three school years side by side, oldest -> newest
  const years = useMemo(() => [shiftYear(year, -2), shiftYear(year, -1), year], [year]);

  useEffect(() => {
    api.get('/questions').then((r) => setQuestions(r.data)).catch((e) => setError(errMsg(e)));
  }, []);

  const loadProgress = useCallback(() => {
    if (!schoolId) return;
    api.get('/answers/progress', { params: { school: schoolId, year } }).then((r) => setProgress(r.data)).catch(() => {});
  }, [schoolId, year]);

  const loadAnswers = useCallback(async () => {
    if (!schoolId) return;
    try {
      const { data } = await api.get('/answers', { params: { school: schoolId, years: years.join(','), month } });
      setAnswers(Object.fromEntries(data.answers.map((a) => [`${a.schoolYear}|${a.questionKey}`, a])));
      setAttachments(Object.fromEntries(data.attachments.map((a) => [`${a.schoolYear}|${a.questionKey}`, a.count])));
    } catch (e) { setError(errMsg(e, 'Kon antwoorden niet laden.')); }
  }, [schoolId, years, month]);

  useEffect(() => { loadAnswers(); }, [loadAnswers]);
  useEffect(() => { loadProgress(); }, [loadProgress]);

  if (!schoolId) return <NoSchool />;

  const monthQuestions = questions.filter((q) => q.month === month);
  const valueOf = (y, key) => answers[`${y}|${key}`]?.value;

  // Group into sections -> groups, preserving the Excel order
  const sections = [];
  for (const q of monthQuestions) {
    let s = sections.find((x) => x.name === q.section);
    if (!s) sections.push((s = { name: q.section, groups: [] }));
    let g = s.groups.find((x) => x.name === q.group);
    if (!g) s.groups.push((g = { name: q.group, items: [] }));
    g.items.push(q);
  }

  async function saveAnswer(y, question, patch) {
    const { data } = await api.put('/answers', { school: schoolId, schoolYear: y, questionKey: question.key, ...patch });
    setAnswers((prev) => {
      const next = { ...prev };
      if (data.deleted) delete next[`${y}|${question.key}`]; else next[`${y}|${question.key}`] = data;
      return next;
    });
    loadProgress();
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Vragenlijst</h1>
          <p>Vul per peilmoment de gegevens in. Wijzigingen worden automatisch opgeslagen.</p>
        </div>
        <label className="checkbox-row">
          <input type="checkbox" checked={editPast} onChange={(e) => setEditPast(e.target.checked)} />
          Vorige schooljaren bewerken
        </label>
      </div>

      <ErrorBanner message={error} />

      <div className="month-tabs">
        {MONTHS.map((m) => {
          const p = progress?.perMonth.find((x) => x.month === m.key);
          return (
            <button key={m.key} className={`month-tab ${m.key === month ? 'active' : ''}`} onClick={() => setParams({ maand: m.key })}>
              {m.label}{p && p.total > 0 && <small>{p.answered}/{p.total}</small>}
            </button>
          );
        })}
      </div>

      {sections.length === 0 && <p className="muted">Geen vragen voor dit peilmoment.</p>}

      {sections.map((s) => (
        <table className="q-table" key={s.name}>
          <thead>
            <tr>
              <th>Vraag</th>
              {years.map((y) => <th key={y} className={`year ${y === year ? 'current' : ''}`}>{y}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr className="q-section"><td colSpan={4}>{s.name}</td></tr>
            {s.groups.map((g) => (
              <GroupRows key={g.name || 'root'} group={g} years={years} year={year} editPast={editPast}
                answers={answers} attachments={attachments} valueOf={valueOf}
                inschalingOptions={refList('inschaling')}
                onSave={saveAnswer} onOpen={(question, y) => setDetail({ question, year: y })} />
            ))}
          </tbody>
        </table>
      ))}

      {detail && (
        <AnswerModal
          question={detail.question}
          year={detail.year}
          answer={answers[`${detail.year}|${detail.question.key}`]}
          onClose={() => setDetail(null)}
          onSaved={(data) => setAnswers((prev) => {
            const next = { ...prev }; const k = `${detail.year}|${detail.question.key}`;
            if (data.deleted) delete next[k]; else next[k] = data; return next;
          })}
          onAttachmentsChanged={loadAnswers}
        />
      )}
    </div>
  );
}

function GroupRows({ group, years, year, editPast, answers, attachments, valueOf, inschalingOptions, onSave, onOpen }) {
  return (
    <>
      {group.name && <tr className="q-group"><td colSpan={4}>{group.name}</td></tr>}
      {group.items.map((q) => {
        const isSum = q.sumOf && q.sumOf.length > 0;
        return (
          <tr key={q.key}>
            <td className="qtext">{q.text}{q.answerType === 'percentage' && <small>in %</small>}{q.answerType === 'scale10' && <small>score op 10</small>}</td>
            {years.map((y) => {
              const a = answers[`${y}|${q.key}`];
              const extra = !!(a?.comment || a?.consultantNote || attachments[`${y}|${q.key}`]);
              return (
                <td className="cell" key={y}>
                  <AnswerCell
                    question={q}
                    answer={a}
                    disabled={isSum || (y !== year && !editPast)}
                    inschalingOptions={inschalingOptions}
                    computedValue={isSum ? sumFor(q, (k) => valueOf(y, k)) : undefined}
                    hasExtra={extra}
                    onSave={(patch) => onSave(y, q, patch)}
                    onOpenDetails={() => onOpen(q, y)}
                  />
                </td>
              );
            })}
          </tr>
        );
      })}
    </>
  );
}
