const { generateOccurrencesForUser } = require('../services/scheduleService');

const generateUserScheduleWindow = (userId, options = {}) => (
  generateOccurrencesForUser(userId, {
    petId: options.petId || null,
    horizonDays: options.horizonDays || 45
  })
);

module.exports = {
  generateUserScheduleWindow
};
