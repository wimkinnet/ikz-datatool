// Helpers for reading answer values, incl. questions that are the sum of other questions.

function toNumber(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// answersByKey: { [questionKey]: value }. Returns the numeric value for a question,
// adding up its parts when it is a computed total.
function numericValue(question, answersByKey) {
  if (question.sumOf && question.sumOf.length) {
    const parts = question.sumOf.map((k) => toNumber(answersByKey[k])).filter((n) => n !== null);
    return parts.length ? parts.reduce((a, b) => a + b, 0) : null;
  }
  return toNumber(answersByKey[question.key]);
}

function isFilled(v) {
  return v !== null && v !== undefined && v !== '';
}

module.exports = { toNumber, numericValue, isFilled };
