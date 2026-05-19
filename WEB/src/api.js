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
  set(tokens, user) {
    const existing = this.get();
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
      ...tokens,
      user: user || existing?.user || null
    }));
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

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

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
  tokenStorage.set(data.tokens, data.user);
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

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers
    });
  } catch (error) {
    throw new ApiError(error.message || 'Network request failed', 0);
  }

  if (response.status === 401 && needsAuth && allowRefresh) {
    await refreshSession();
    return request(path, options, needsAuth, false);
  }

  if (!response.ok) {
    throw new ApiError(await getErrorMessage(response), response.status);
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
  },

  predictBreed(file) {
    const formData = new FormData();
    formData.append('file', file);

    return request('/api/ml/predict/breed', {
      method: 'POST',
      body: formData
    });
  }
};

export const careApi = {
  listPets() {
    return request('/api/pets');
  },

  createPet(payload) {
    return request('/api/pets', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  updatePet(id, payload) {
    return request(`/api/pets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  addPetImage(petId, payload) {
    return request(`/api/pets/${petId}/images`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  listReminders(petId, options = {}) {
    const params = new URLSearchParams();
    if (petId) params.set('petId', petId);
    if (options.generate === false) params.set('generate', 'false');

    return request(`/api/schedules${params.toString() ? `?${params}` : ''}`);
  },

  createReminder(payload) {
    return request('/api/schedules/templates', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  listScheduleTemplates(petId) {
    return request(`/api/schedules/templates${petId ? `?petId=${petId}` : ''}`);
  },

  generateSchedule(petId) {
    return request('/api/schedules/generate', {
      method: 'POST',
      body: JSON.stringify({ petId })
    });
  },

  completeReminder(reminderId) {
    return request(`/api/schedules/${reminderId}/action`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'complete' })
    });
  },

  updateReminder(reminderId, payload) {
    return request(`/api/schedules/${reminderId}/action`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  listVaccines(petId) {
    return request(`/api/vaccines${petId ? `?petId=${petId}` : ''}`);
  },

  vaccineRecommendations(petId, region = 'US') {
    return request(`/api/vaccines/recommendations/${petId}?region=${encodeURIComponent(region)}`);
  },

  createVaccine(payload) {
    return request('/api/vaccines', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  listFeedingPlans(petId) {
    return request(`/api/feeding${petId ? `?petId=${petId}` : ''}`);
  },

  feedingRecommendation(petId) {
    return request(`/api/feeding/recommendations/${petId}`);
  },

  saveFeedingPlan(payload) {
    return request('/api/feeding', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  listHealthRecords(petId) {
    return request(`/api/health-records${petId ? `?petId=${petId}` : ''}`);
  },

  createHealthRecord(payload) {
    return request('/api/health-records', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  listAppointments(petId) {
    return request(`/api/appointments${petId ? `?petId=${petId}` : ''}`);
  },

  createAppointment(payload) {
    return request('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  insights(petId) {
    return request(`/api/insights/${petId}`);
  },

  analyzeSymptoms(payload) {
    return request('/api/insights/symptoms/analyze', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
};

export const socialApi = {
  summary() {
    return request('/api/social/summary');
  },

  getLocation() {
    return request('/api/social/location');
  },

  saveLocation(payload) {
    return request('/api/social/location', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  nearby(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') params.set(key, value);
    });
    return request(`/api/social/nearby${params.toString() ? `?${params}` : ''}`);
  },

  listConnections() {
    return request('/api/social/connections');
  },

  requestConnection(receiverId) {
    return request('/api/social/connections', {
      method: 'POST',
      body: JSON.stringify({ receiverId })
    });
  },

  updateConnection(id, status) {
    return request(`/api/social/connections/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },

  conversations() {
    return request('/api/social/messages');
  },

  messages(userId) {
    return request(`/api/social/messages/${userId}`);
  },

  sendMessage(payload) {
    return request('/api/social/messages', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  groups() {
    return request('/api/social/groups');
  },

  createGroup(payload) {
    return request('/api/social/groups', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  joinGroup(id) {
    return request(`/api/social/groups/${id}/join`, { method: 'POST' });
  },

  meetups() {
    return request('/api/social/meetups');
  },

  createMeetup(payload) {
    return request('/api/social/meetups', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  joinMeetup(id) {
    return request(`/api/social/meetups/${id}/join`, { method: 'POST' });
  },

  lostPets() {
    return request('/api/social/lost-pets');
  },

  createLostPetAlert(payload) {
    return request('/api/social/lost-pets', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  blockUser(payload) {
    return request('/api/social/safety/block', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  reportUser(payload) {
    return request('/api/social/safety/report', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
};
