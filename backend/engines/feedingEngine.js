const { generateFeedingPlan } = require('../services/petCareIntelligence');

const buildFeedingPreference = (pet, overrides = {}) => {
  const recommendation = generateFeedingPlan(pet);
  const mealsPerDay = overrides.mealsPerDay || recommendation.mealsPerDay;
  const feedingTimes = overrides.feedingTimes?.length
    ? overrides.feedingTimes
    : recommendation.feedingTimes.slice(0, mealsPerDay);

  return {
    caloriesPerDay: overrides.caloriesPerDay || recommendation.caloriesPerDay,
    mealsPerDay,
    feedingTimes,
    dietType: overrides.dietType || 'complete-balanced',
    hydrationGoal: overrides.hydrationGoal || recommendation.hydrationGoalMl,
    metadata: {
      quantityPerMeal: recommendation.quantityPerMeal,
      foodSuggestions: recommendation.foodSuggestions,
      confidence: recommendation.confidence
    }
  };
};

const buildFeedingScheduleTemplate = (pet, preferences) => ({
  petId: pet.id,
  type: 'feeding',
  title: `${pet.name} meal`,
  description: preferences.metadata?.quantityPerMeal || 'Meal reminder',
  recurrenceRule: { frequency: 'daily', interval: 1 },
  preferredTimes: preferences.feedingTimes,
  startDate: new Date().toISOString().slice(0, 10),
  timezone: preferences.timezone || 'UTC',
  metadata: {
    caloriesPerDay: preferences.caloriesPerDay,
    mealsPerDay: preferences.mealsPerDay,
    dietType: preferences.dietType,
    hydrationGoal: preferences.hydrationGoal
  }
});

module.exports = {
  buildFeedingPreference,
  buildFeedingScheduleTemplate
};
