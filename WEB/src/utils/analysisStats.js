const STORAGE_KEY = 'pawverse.analysisStats';

const emptyStats = {
  totalAnalyses: 0,
  lastAnalysis: null,
  petSpecies: null
};

const readAllStats = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
};

const writeAllStats = (stats) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
};

const getUserKey = (user) => user?.id || user?.email || 'anonymous';

export const getAnalysisStats = (user) => {
  const allStats = readAllStats();
  return {
    ...emptyStats,
    ...(allStats[getUserKey(user)] || {})
  };
};

export const recordAnalysisComplete = (user, species) => {
  const allStats = readAllStats();
  const userKey = getUserKey(user);
  const currentStats = {
    ...emptyStats,
    ...(allStats[userKey] || {})
  };

  const nextStats = {
    totalAnalyses: currentStats.totalAnalyses + 1,
    lastAnalysis: new Date().toISOString(),
    petSpecies: species || currentStats.petSpecies
  };

  writeAllStats({
    ...allStats,
    [userKey]: nextStats
  });

  return nextStats;
};
