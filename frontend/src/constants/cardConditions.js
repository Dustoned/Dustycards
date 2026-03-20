export const CONDITION_CODES = [
  'Mint',
  'Near Mint',
  'Excellent',
  'Good',
  'Light Played',
  'Played',
  'Poor',
];

export const CONDITION_LABELS = Object.fromEntries(
  CONDITION_CODES.map((condition) => [condition, condition])
);

export const CONDITION_OPTION_LABELS = CONDITION_LABELS;
