const STORAGE_KEY = 'pawverse.onboarding';

const readState = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
};

const writeState = (state) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const keyFor = (user) => user?.id || user?.email || 'anonymous';

export const getOnboardingState = (user) => {
  const all = readState();
  return all[keyFor(user)] || { completed: false, skipped: false, isPetOwner: null };
};

export const setOnboardingState = (user, value) => {
  const all = readState();
  const next = {
    ...all,
    [keyFor(user)]: {
      ...getOnboardingState(user),
      ...value
    }
  };
  writeState(next);
  return next[keyFor(user)];
};
