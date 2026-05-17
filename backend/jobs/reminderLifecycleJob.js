const { generateOccurrencesForUser, markOverdueOccurrences } = require('../services/scheduleService');

const startReminderLifecycleJob = () => {
  const intervalMs = Number(process.env.REMINDER_JOB_INTERVAL_MS || 15 * 60 * 1000);

  const run = async () => {
    try {
      await markOverdueOccurrences();
      if (process.env.DEFAULT_SCHEDULER_USER_ID) {
        await generateOccurrencesForUser(process.env.DEFAULT_SCHEDULER_USER_ID, { horizonDays: 45 });
      }
    } catch (error) {
      console.error('Reminder lifecycle job failed:', error);
    }
  };

  const timer = setInterval(run, intervalMs);
  timer.unref?.();
  run();

  return timer;
};

module.exports = { startReminderLifecycleJob };
