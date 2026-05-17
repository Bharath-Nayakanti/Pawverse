const { generateInsights } = require('../services/petCareIntelligence');

const scoreAdherence = (occurrences = []) => {
  const tracked = occurrences.filter((item) => ['completed', 'overdue', 'skipped'].includes(item.status));
  if (!tracked.length) return 100;
  const completed = tracked.filter((item) => item.status === 'completed').length;
  return Math.round((completed / tracked.length) * 100);
};

const generateLifecycleInsights = ({ pet, vaccines = [], reminders = [], healthRecords = [], taskLogs = [] }) => {
  const insights = generateInsights({ pet, vaccines, reminders, healthRecords });
  const adherenceScore = scoreAdherence(reminders);
  const missedMedication = taskLogs.filter((log) => (
    log.action === 'missed' && log.metadata?.type === 'medication'
  ));

  insights.unshift({
    type: 'adherence',
    severity: adherenceScore < 70 ? 'high' : adherenceScore < 85 ? 'moderate' : 'low',
    title: `${pet.name}'s care adherence is ${adherenceScore}%.`,
    summary: adherenceScore < 85
      ? 'Review overdue and skipped tasks to bring routine care back on track.'
      : 'Routine care completion is steady across recent scheduled tasks.',
    confidence: 0.86,
    metadata: { adherenceScore }
  });

  if (missedMedication.length) {
    insights.push({
      type: 'medication',
      severity: 'high',
      title: `${pet.name} missed ${missedMedication.length} medication task${missedMedication.length > 1 ? 's' : ''}.`,
      summary: 'Medication misses can affect treatment quality. Consider tighter reminders or a different time.',
      confidence: 0.88
    });
  }

  return insights;
};

module.exports = {
  generateLifecycleInsights,
  scoreAdherence
};
