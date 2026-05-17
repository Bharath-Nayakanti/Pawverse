const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';
const AUTH_STORAGE_KEY = 'pawverse.auth';

export const tokenStorage = {
  get() {
    try {
      return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY));
    } catch {
      return null;
    }
  },
  set(tokens) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(tokens));
  },
  clear() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
};

const getErrorMessage = async (response) => {
  try {
    const data = await response.json();
    if (data.details?.length) {
      return data.details.map((item) => item.message).join(', ');
    }
    return data.error || data.message || 'Request failed';
  } catch {
    return 'Request failed';
  }
};

const refreshSession = async () => {
  const tokens = tokenStorage.get();
  if (!tokens?.refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: tokens.refreshToken })
  });

  if (!response.ok) {
    tokenStorage.clear();
    throw new Error(await getErrorMessage(response));
  }

  const data = await response.json();
  tokenStorage.set(data.tokens);
  return data;
};

const request = async (path, options = {}, needsAuth = true, allowRefresh = true) => {
  const headers = new Headers(options.headers || {});
  const hasFormBody = options.body instanceof FormData;

  if (!hasFormBody && options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (needsAuth) {
    const tokens = tokenStorage.get();
    if (tokens?.accessToken) {
      headers.set('Authorization', `Bearer ${tokens.accessToken}`);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  if (response.status === 401 && needsAuth && allowRefresh) {
    await refreshSession();
    return request(path, options, needsAuth, false);
  }

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return response.json();
};

export const authApi = {
  login(credentials) {
    return request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    }, false);
  },

  register(payload) {
    return request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    }, false);
  },

  profile() {
    return request('/api/auth/profile');
  },

  async logout() {
    const tokens = tokenStorage.get();
    return request('/api/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: tokens?.refreshToken })
    });
  }
};

export const api = {
  healthCheck() {
    return request('/health', {}, false);
  },

  predictSpecies(file) {
    const formData = new FormData();
    formData.append('file', file);

    return request('/api/ml/predict/species', {
      method: 'POST',
      body: formData
    });
  },

  predictDisease(file, species) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('species', species);

    return request('/api/ml/predict/disease', {
      method: 'POST',
      body: formData
    });
  },

  startSymptomChecker(species) {
    return request(`/api/ml/symptom/start?species=${encodeURIComponent(species)}`, {
      method: 'POST'
    });
  },

  answerSymptomQuestion(sessionId, symptomId, answer) {
    const params = new URLSearchParams({
      session_id: sessionId,
      symptom_id: symptomId,
      answer
    });

    return request(`/api/ml/symptom/answer?${params}`, {
      method: 'POST'
    });
  },

  getSymptomResults(sessionId) {
    return request(`/api/ml/symptom/results/${sessionId}`);
  },

  combineDiagnosis(imageResult, symptomResult) {
    return request('/api/ml/diagnosis/combine', {
      method: 'POST',
      body: JSON.stringify({
        image_result: imageResult,
        symptom_result: symptomResult
      })
    });
  }
};
