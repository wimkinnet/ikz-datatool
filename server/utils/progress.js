const Question = require('../models/Question');
const Answer = require('../models/Answer');
const { MONTHS } = require('./constants');
const { isFilled } = require('./answerValues');

// Per month: how many of the (input) questions have an answer for this school + year.
async function computeProgress(schoolId, schoolYear) {
  const questions = await Question.find({ active: true }).lean();
  const inputQs = questions.filter((q) => !(q.sumOf && q.sumOf.length));
  const answers = await Answer.find({ school: schoolId, schoolYear }).lean();
  const filled = new Set(answers.filter((a) => isFilled(a.value) && a.value !== '').map((a) => a.questionKey));

  const perMonth = MONTHS.map((month) => {
    const qs = inputQs.filter((q) => q.month === month);
    const done = qs.filter((q) => filled.has(q.key)).length;
    return { month, total: qs.length, answered: done };
  });
  const total = perMonth.reduce((s, m) => s + m.total, 0);
  const answered = perMonth.reduce((s, m) => s + m.answered, 0);
  return { perMonth, total, answered, percent: total ? Math.round((answered / total) * 100) : 0 };
}

module.exports = { computeProgress };
