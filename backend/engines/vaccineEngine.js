const { generateVaccineRecommendations } = require('../services/petCareIntelligence');

const buildVaccinePlan = (pet, records = [], region = 'US') => {
  const historyByName = new Map(
    records.map((record) => [String(record.vaccine_name || record.vaccineName).toLowerCase(), record])
  );

  return generateVaccineRecommendations(pet, region).map((recommendation) => {
    const existing = historyByName.get(recommendation.vaccineName.toLowerCase());
    if (!existing) return recommendation;

    const nextDueAt = existing.next_due_at || existing.nextDueAt || recommendation.nextBoosterAt;
    return {
      ...recommendation,
      status: nextDueAt && new Date(nextDueAt) < new Date() ? 'overdue' : 'scheduled',
      dueAt: nextDueAt || recommendation.dueAt,
      administeredAt: existing.administered_at || existing.administeredAt,
      veterinarian: existing.veterinarian || existing.provider
    };
  });
};

const buildVaccineScheduleTemplate = (pet, recommendation) => ({
  petId: pet.id,
  type: 'vaccine',
  title: `${recommendation.vaccineName} vaccine`,
  description: recommendation.description,
  recurrenceRule: { frequency: 'yearly', interval: 1 },
  preferredTimes: ['10:00'],
  startDate: new Date(recommendation.dueAt).toISOString().slice(0, 10),
  timezone: recommendation.timezone || 'UTC',
  metadata: recommendation
});

module.exports = {
  buildVaccinePlan,
  buildVaccineScheduleTemplate
};
