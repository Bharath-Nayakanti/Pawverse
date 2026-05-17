const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const yearsBetween = (date) => {
  if (!date) return null;
  const born = new Date(date);
  if (Number.isNaN(born.getTime())) return null;
  return Math.max(0, (Date.now() - born.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
};

const getAgeYears = (pet) => {
  if (pet.age_years !== null && pet.age_years !== undefined) return Number(pet.age_years);
  if (pet.ageYears !== null && pet.ageYears !== undefined) return Number(pet.ageYears);
  return yearsBetween(pet.date_of_birth || pet.dateOfBirth) || 1;
};

const vaccineCatalog = {
  dog: [
    { name: 'DHPP', description: 'Core protection for distemper, hepatitis, parainfluenza, and parvo.', firstDueDays: 42, boosterMonths: 12 },
    { name: 'Rabies', description: 'Core rabies vaccination. Legal cadence varies by region.', firstDueDays: 84, boosterMonths: 12 },
    { name: 'Parvo', description: 'Extra attention for high-risk puppies and shelter exposure.', firstDueDays: 42, boosterMonths: 12 },
    { name: 'Bordetella', description: 'Recommended for social dogs, grooming, boarding, and daycare.', firstDueDays: 70, boosterMonths: 12 }
  ],
  cat: [
    { name: 'FVRCP', description: 'Core protection against feline viral rhinotracheitis, calicivirus, and panleukopenia.', firstDueDays: 42, boosterMonths: 12 },
    { name: 'Rabies', description: 'Core rabies vaccination. Legal cadence varies by region.', firstDueDays: 84, boosterMonths: 12 },
    { name: 'FeLV', description: 'Recommended for kittens and cats with outdoor or unknown exposure.', firstDueDays: 56, boosterMonths: 12 }
  ]
};

const breedRisks = [
  { match: /german shepherd/i, insight: 'German Shepherds are prone to hip dysplasia and degenerative joint disease.', severity: 'moderate' },
  { match: /golden retriever/i, insight: 'Golden Retrievers have elevated risk for skin allergies, ear infections, and some cancers.', severity: 'moderate' },
  { match: /bulldog|pug|shih tzu/i, insight: 'Brachycephalic breeds need careful heat, breathing, and exercise monitoring.', severity: 'high' },
  { match: /persian/i, insight: 'Persian cats can be prone to tear staining, dental issues, and kidney disease.', severity: 'moderate' },
  { match: /maine coon/i, insight: 'Maine Coons benefit from heart monitoring because of hypertrophic cardiomyopathy risk.', severity: 'moderate' }
];

const generateVaccineRecommendations = (pet, region = 'US') => {
  const species = (pet.species || 'dog').toLowerCase();
  const ageYears = getAgeYears(pet);
  const birthDate = pet.date_of_birth || pet.dateOfBirth
    ? new Date(pet.date_of_birth || pet.dateOfBirth)
    : addDays(new Date(), -Math.round(ageYears * 365));
  const now = new Date();

  return (vaccineCatalog[species] || vaccineCatalog.dog).map((item) => {
    const firstDue = addDays(birthDate, item.firstDueDays);
    const dueAt = firstDue < now ? addDays(now, 14) : firstDue;
    const status = firstDue < now ? 'overdue' : 'suggested';

    return {
      vaccineName: item.name,
      description: item.description,
      status,
      dueAt: dueAt.toISOString(),
      nextBoosterAt: addDays(dueAt, item.boosterMonths * 30).toISOString(),
      region,
      confidence: species === 'dog' || species === 'cat' ? 0.88 : 0.65
    };
  });
};

const generateFeedingPlan = (pet) => {
  const weightKg = Number(pet.weight_kg || pet.weightKg || 10);
  const ageYears = getAgeYears(pet);
  const activityLevel = pet.activity_level || pet.activityLevel || 'moderate';
  const multipliers = { low: 1.2, moderate: 1.6, high: 2.0 };
  const lifeStageBoost = ageYears < 1 ? 2.2 : ageYears > 8 ? 1.2 : 1.6;
  const rer = 70 * Math.pow(Math.max(weightKg, 1), 0.75);
  const calories = Math.round(rer * (multipliers[activityLevel] || lifeStageBoost));
  const meals = ageYears < 1 ? 3 : 2;
  const hydration = Math.round(weightKg * 55);

  // More flexible feeding times based on meal count
  const feedingTimes = meals === 3
    ? ['07:30', '13:00', '19:00']
    : meals === 2
      ? ['08:00', '19:00']
      : ['09:00'];

  return {
    caloriesPerDay: calories,
    mealsPerDay: meals,
    quantityPerMeal: `${Math.max(1, Math.round(calories / meals))} kcal per meal`,
    hydrationGoalMl: hydration,
    feedingTimes,
    foodSuggestions: [
      'Complete and balanced food matched to species and life stage',
      'High-quality protein with controlled treats under 10% of calories',
      weightKg > 30 ? 'Joint-support formula may be useful for large breeds' : 'Monitor body condition every 2-4 weeks'
    ],
    confidence: 0.82,
    disclaimer: 'Use as a planning guide and confirm exact diet needs with a veterinarian.'
  };
};

const generateDefaultReminders = (pet) => {
  const now = new Date();
  const feeding = generateFeedingPlan(pet);
  const vaccines = generateVaccineRecommendations(pet);

  // Fix timezone issue: properly construct date with local time
  const createLocalDateTime = (date, timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result.toISOString();
  };

  // Validate pet has required data
  const petName = pet.name || pet.confirmed_breed || pet.breed || 'Pet';
  const petSpecies = pet.species || 'dog';

  const reminders = [
    ...feeding.feedingTimes.map((time) => ({
      type: 'feeding',
      title: `${petName} meal`,
      description: feeding.quantityPerMeal,
      dueAt: createLocalDateTime(now, time),
      recurrence: 'daily',
      status: 'upcoming',
      metadata: { caloriesPerDay: feeding.caloriesPerDay }
    })),
    {
      type: 'grooming',
      title: 'Grooming check',
      description: 'Brush coat, inspect ears, paws, and skin.',
      dueAt: addDays(now, 7).toISOString(),
      recurrence: 'weekly',
      status: 'upcoming',
      metadata: {}
    },
    {
      type: 'flea_tick',
      title: 'Flea and tick prevention',
      description: 'Confirm preventive dose or treatment with your vet.',
      dueAt: addDays(now, 30).toISOString(),
      recurrence: 'monthly',
      status: 'upcoming',
      metadata: {}
    },
    ...vaccines.map((vaccine) => ({
      type: 'vaccine',
      title: `${vaccine.vaccineName} vaccine`,
      description: vaccine.description,
      dueAt: vaccine.dueAt,
      recurrence: 'yearly',
      status: vaccine.status === 'overdue' ? 'overdue' : 'upcoming',
      metadata: vaccine
    }))
  ];

  return reminders;
};

const analyzeSymptoms = ({ symptoms = [], species = 'dog' }) => {
  const normalized = symptoms.map((symptom) => symptom.toLowerCase());
  const emergencyTerms = ['collapse', 'seizure', 'bloated abdomen', 'trouble breathing', 'bleeding', 'poison', 'unconscious'];
  const highTerms = ['vomiting', 'lethargy', 'blood', 'not eating', 'pain'];
  const moderateTerms = ['itching', 'cough', 'limping', 'diarrhea'];
  const emergencyMatches = normalized.filter((symptom) => emergencyTerms.some((term) => symptom.includes(term)));
  const highMatches = normalized.filter((symptom) => highTerms.some((term) => symptom.includes(term)));
  const moderateMatches = normalized.filter((symptom) => moderateTerms.some((term) => symptom.includes(term)));
  const score = Math.min(100, emergencyMatches.length * 45 + highMatches.length * 25 + moderateMatches.length * 15 + normalized.length * 5);
  const severity = score >= 75 ? 'emergency' : score >= 45 ? 'high' : score >= 25 ? 'moderate' : 'low';

  return {
    species,
    symptoms,
    urgencyScore: score,
    severity,
    confidence: normalized.length >= 2 ? 0.82 : 0.62,
    emergencyDetected: severity === 'emergency',
    recommendation: severity === 'emergency'
      ? 'Seek emergency veterinary care immediately.'
      : severity === 'high'
        ? 'Visit a veterinarian within 24 hours.'
        : severity === 'moderate'
          ? 'Monitor closely and schedule a vet visit if symptoms persist or worsen.'
          : 'Track symptoms and continue routine care.',
    recommendedActions: [
      'Log symptom onset and frequency',
      'Keep hydration available',
      severity === 'emergency' ? 'Call an emergency clinic before travel' : 'Avoid giving human medication unless prescribed'
    ]
  };
};

const generateInsights = ({ pet, vaccines = [], reminders = [], healthRecords = [] }) => {
  const insights = [];
  const breed = pet.confirmed_breed || pet.breed || pet.predicted_breed || '';
  const now = new Date();
  const overdueVaccines = vaccines.filter((item) => item.status === 'overdue' || (item.due_at && new Date(item.due_at) < now && item.status !== 'completed'));
  const overdueReminders = reminders.filter((item) => item.status === 'overdue' || (item.due_at && new Date(item.due_at) < now && item.status !== 'completed'));
  const weights = healthRecords
    .filter((record) => record.type === 'weight' && record.metadata?.weightKg)
    .sort((a, b) => new Date(a.occurred_at) - new Date(b.occurred_at));

  if (overdueVaccines.length) {
    insights.push({
      type: 'vaccine',
      severity: 'high',
      title: `${pet.name} missed ${overdueVaccines.length} vaccine${overdueVaccines.length > 1 ? 's' : ''}.`,
      summary: 'Review vaccine timeline and schedule boosters.',
      confidence: 0.9
    });
  }

  if (overdueReminders.length) {
    insights.push({
      type: 'schedule',
      severity: 'moderate',
      title: `${overdueReminders.length} care task${overdueReminders.length > 1 ? 's are' : ' is'} overdue.`,
      summary: 'Catching up on recurring care reduces preventable health risk.',
      confidence: 0.86
    });
  }

  if (weights.length >= 2) {
    const first = Number(weights[0].metadata.weightKg);
    const latest = Number(weights[weights.length - 1].metadata.weightKg);
    const change = first ? Math.round(((latest - first) / first) * 100) : 0;
    if (Math.abs(change) >= 10) {
      insights.push({
        type: 'weight',
        severity: Math.abs(change) >= 15 ? 'high' : 'moderate',
        title: `${pet.name} has ${change > 0 ? 'gained' : 'lost'} ${Math.abs(change)}% weight.`,
        summary: 'Weight changes over 10% deserve diet and health review.',
        confidence: 0.84
      });
    }
  }

  const breedRisk = breedRisks.find((risk) => risk.match.test(breed));
  if (breedRisk) {
    insights.push({
      type: 'breed_risk',
      severity: breedRisk.severity,
      title: 'Breed-specific risk watch',
      summary: breedRisk.insight,
      confidence: 0.78
    });
  }

  if (!insights.length) {
    insights.push({
      type: 'wellness',
      severity: 'low',
      title: `${pet.name} has no urgent alerts right now.`,
      summary: 'Keep schedules current and continue routine health tracking.',
      confidence: 0.74
    });
  }

  return insights;
};

module.exports = {
  analyzeSymptoms,
  generateDefaultReminders,
  generateFeedingPlan,
  generateInsights,
  generateVaccineRecommendations
};
