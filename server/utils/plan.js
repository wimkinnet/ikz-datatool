const PlanItem = require('../models/PlanItem');
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const { monthIndex } = require('./constants');
const { numericValue } = require('./answerValues');

// Loads a school's plan for a school year and applies "auto" statuses:
// when a row is linked to a question and has a numeric threshold, its status follows the data.
async function loadPlan(schoolId, schoolYear) {
  const items = await PlanItem.find({ school: schoolId, schoolYear }).lean();
  const linkedKeys = [...new Set(items.filter((i) => i.statusMode === 'auto' && i.questionKey).map((i) => i.questionKey))];

  let answersByKey = {};
  let questionsByKey = {};
  if (linkedKeys.length) {
    const questions = await Question.find({ key: { $in: linkedKeys } }).lean();
    questionsByKey = Object.fromEntries(questions.map((q) => [q.key, q]));
    const partKeys = questions.flatMap((q) => q.sumOf || []);
    const answers = await Answer.find({ school: schoolId, schoolYear, questionKey: { $in: [...linkedKeys, ...partKeys] } }).lean();
    answersByKey = Object.fromEntries(answers.map((a) => [a.questionKey, a.value]));
  }

  const result = items.map((item) => {
    const out = { ...item, statusSource: 'manual', linkedValue: null };
    if (item.statusMode === 'auto' && item.questionKey && item.thresholdValue !== null && item.thresholdValue !== undefined) {
      const q = questionsByKey[item.questionKey];
      const value = q ? numericValue(q, answersByKey) : null;
      out.linkedValue = value;
      if (value !== null) {
        const ok = item.thresholdDirection === 'max' ? value <= item.thresholdValue : value >= item.thresholdValue;
        out.status = ok ? 'ok' : 'actie';
        out.statusSource = 'auto';
      }
    }
    return out;
  });

  result.sort((a, b) => monthIndex(a.month) - monthIndex(b.month) || (a.order || 0) - (b.order || 0));
  return result;
}

module.exports = { loadPlan };
