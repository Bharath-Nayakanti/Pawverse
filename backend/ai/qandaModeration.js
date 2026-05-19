const axios = require('axios');

const PET_TERMS = [
  'pet', 'dog', 'puppy', 'cat', 'kitten', 'bird', 'parrot', 'fish', 'aquarium', 'rabbit',
  'hamster', 'guinea pig', 'turtle', 'reptile', 'vet', 'veterinary', 'vaccine',
  'vaccination', 'rabies', 'food', 'feeding', 'grooming', 'training', 'leash',
  'litter', 'fur', 'coat', 'paw', 'vomit', 'diarrhea', 'itching', 'adoption',
  'lost pet', 'breed', 'spay', 'neuter', 'tick', 'flea', 'kennel', 'walking'
];

const CATEGORY_TERMS = {
  Health: ['vomit', 'diarrhea', 'bleeding', 'seizure', 'cough', 'infection', 'eye', 'skin', 'pain', 'sick', 'vet', 'vaccine', 'rabies'],
  Food: ['food', 'feed', 'diet', 'kibble', 'treat', 'nutrition', 'meal', 'calorie'],
  Grooming: ['groom', 'bath', 'brush', 'coat', 'fur', 'nail', 'ear clean'],
  Training: ['train', 'leash', 'bite', 'bark', 'obedience', 'potty', 'litter'],
  Adoption: ['adopt', 'rescue', 'shelter', 'foster'],
  Emergency: ['emergency', 'poison', 'seizure', 'bleeding', 'breathing', 'choking', 'collapse'],
  'Lost & Found': ['lost', 'found', 'missing', 'stray'],
  Nearby: ['nearby', 'area', 'city', 'park', 'clinic', 'recommendation']
};

const PROFANITY = ['fuck', 'shit', 'bitch', 'asshole', 'bastard'];
const PROMO_PATTERNS = [
  /crypto|forex|casino|betting|free money|investment/i,
  /hack(ing)?\s+(wifi|account|password)/i,
  /telegram|whatsapp\s+me|limited offer/i,
  /(https?:\/\/\S+.*){3,}/i
];
const EMERGENCY_TERMS = ['seizure', 'bleeding', 'poison', 'choking', 'breathing', 'collapse', 'unconscious', 'hit by', 'paralysis'];
const TOXIC_TERMS = ['kill yourself', 'hate speech', 'terrorist', 'threaten'];

const normalize = (value = '') => String(value).toLowerCase();

const unique = (values) => Array.from(new Set(values.filter(Boolean)));

const inferPetType = (text, fallback = 'general') => {
  const body = normalize(text);
  if (/\b(dog|puppy|canine|leash|bark)\b/.test(body)) return 'dog';
  if (/\b(cat|kitten|feline|litter|meow)\b/.test(body)) return 'cat';
  if (/\b(bird|parrot|cockatiel|budgie)\b/.test(body)) return 'bird';
  if (/\b(fish|aquarium|tank)\b/.test(body)) return 'fish';
  if (/\b(rabbit|hamster|turtle|reptile|snake|lizard|guinea pig)\b/.test(body)) return 'exotic';
  return fallback;
};

const inferCategory = (text) => {
  const body = normalize(text);
  const category = Object.entries(CATEGORY_TERMS).find(([, terms]) => terms.some((term) => body.includes(term.toLowerCase())));
  return category?.[0] || 'General';
};

const inferUrgency = (text) => {
  const body = normalize(text);
  if (EMERGENCY_TERMS.some((term) => body.includes(term))) return 'emergency';
  if (/(vomit|diarrhea|not eating|pain|limping|blood|fever)/i.test(body)) return 'medium';
  return 'normal';
};

const ruleFilter = (text) => {
  const body = normalize(text);
  const reasons = [];
  if (PROFANITY.some((term) => body.includes(term))) reasons.push('Contains abusive language.');
  if (PROMO_PATTERNS.some((pattern) => pattern.test(text))) reasons.push('Looks like spam, promotion, scam, or unsafe hacking content.');
  if (/(.)\1{12,}/.test(body)) reasons.push('Repeated characters look like spam.');
  return {
    allowed: reasons.length === 0,
    reasons
  };
};

const localModerate = ({ title = '', body = '', tags = [], petType = 'general' }) => {
  const text = `${title} ${body} ${tags.join(' ')}`;
  const rules = ruleFilter(text);
  const petHits = PET_TERMS.filter((term) => normalize(text).includes(term));
  const unrelatedHints = /(ipl|cricket|stock market|movie|politics|wifi|coding homework|recipe for humans)/i.test(text);
  const toxicity = TOXIC_TERMS.some((term) => normalize(text).includes(term));

  let label = 'pet_related';
  let confidence = Math.min(0.98, 0.58 + petHits.length * 0.08);
  let action = 'approve';

  if (!rules.allowed || toxicity) {
    label = 'unsafe';
    confidence = 0.92;
    action = 'reject';
  } else if (!petHits.length && unrelatedHints) {
    label = 'unrelated';
    confidence = 0.88;
    action = 'reject';
  } else if (!petHits.length) {
    label = 'partially_related';
    confidence = 0.52;
    action = 'flag';
  }

  const category = inferCategory(text);
  const urgency = inferUrgency(text);
  const inferredPetType = inferPetType(text, petType);
  const autoTags = unique([
    inferredPetType !== 'general' && inferredPetType,
    category,
    urgency === 'emergency' && 'Emergency',
    ...petHits.slice(0, 4)
  ].map((tag) => tag && tag.replace(/\b\w/g, (char) => char.toUpperCase())));

  return {
    label,
    confidence,
    action,
    toxicity: { toxic: toxicity, score: toxicity ? 0.91 : 0.04 },
    categories: {
      petType: inferredPetType,
      category,
      urgency,
      tags: autoTags
    },
    reasons: rules.reasons,
    source: 'local-rules'
  };
};

const moderateQuestion = async (payload) => {
  const fallback = localModerate(payload);
  const aiUrl = process.env.QANDA_AI_URL || process.env.ML_SERVICE_URL;
  if (!aiUrl) return fallback;

  try {
    const { data } = await axios.post(`${aiUrl.replace(/\/$/, '')}/qanda/moderate`, payload, { timeout: 2500 });
    return {
      ...fallback,
      ...data,
      categories: { ...fallback.categories, ...(data.categories || {}) },
      reasons: data.reasons || fallback.reasons,
      source: 'ai-service'
    };
  } catch {
    return fallback;
  }
};

module.exports = {
  localModerate,
  moderateQuestion
};
