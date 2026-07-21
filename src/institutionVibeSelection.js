import { VIBE_PROFILES } from './prompts';

const INSTITUTION_RULES = [
  {
    patterns: ['חברון', 'hevron', 'hevron yeshiva'],
    backgroundSummary:
      'ישיבה ליטאית חזקה, תובענית ורצינית, עם נטייה לאווירה הישגית ולומדת מאוד.',
    blacklistedVibeIds: ['easygoing', 'creative', 'technical'],
  },
  {
    patterns: ['מיר', 'mir', 'mir yeshiva'],
    backgroundSummary:
      'ישיבה עמוקה ושמרנית, עם דגש על שקיעות בלימוד, סבלנות, ורצינות מחשבתית.',
    blacklistedVibeIds: ['easygoing', 'creative', 'technical'],
  },
  {
    patterns: ['פוניבז', 'ponovezh', 'poniv'],
    backgroundSummary:
      'סביבה יוקרתית ומאוד חזקה, עם רושם תחרותי, חדות ועמידות גבוהה.',
    blacklistedVibeIds: ['easygoing', 'creative', 'balanced'],
  },
  {
    patterns: ['החדש', 'hachadash', 'new seminary'],
    backgroundSummary:
      'סמינר שמרגיש מודרני יותר, מסודר, מעשי ונוח, עם דגש על התנהלות מאוזנת.',
    blacklistedVibeIds: ['creative', 'technical', 'reflective'],
  },
];

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/["'’״]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function findInstitutionRule(institution) {
  const normalized = normalizeText(institution);
  return INSTITUTION_RULES.find((rule) =>
    rule.patterns.some((pattern) => normalized.includes(normalizeText(pattern))),
  );
}

function pickRandomVibeId(excludedVibeIds = []) {
  const allowedVibes = VIBE_PROFILES.filter((profile) => !excludedVibeIds.includes(profile.id));
  const fallbackPool = allowedVibes.length > 0 ? allowedVibes : VIBE_PROFILES;
  const randomIndex = Math.floor(Math.random() * fallbackPool.length);
  return fallbackPool[randomIndex]?.id ?? 'balanced';
}

export function resolveInstitutionVibeContext({ institution }) {
  const matchedRule = findInstitutionRule(institution);

  if (!matchedRule) {
    return {
      source: 'random',
      backgroundSummary: '',
      blacklistedVibeIds: [],
      vibeId: pickRandomVibeId(),
    };
  }

  const blacklistedVibeIds = matchedRule.blacklistedVibeIds.slice(0, 3);

  return {
    source: 'institution-match',
    backgroundSummary: matchedRule.backgroundSummary,
    blacklistedVibeIds,
    vibeId: pickRandomVibeId(blacklistedVibeIds),
  };
}
