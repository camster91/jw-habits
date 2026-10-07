/** Levels and garden stages, derived from total XP. Pure; nothing is stored. */

export const LEVEL_NAMES = [
  'Seed',
  'Sprout',
  'Seedling',
  'Sapling',
  'Young Tree',
  'Flourishing Tree',
  'Cedar',
  'Fruitful Tree',
];

/** Total XP needed to reach level n. */
export const levelFloor = (n) => (100 * n * (n + 1)) / 2;

/** Level 8 and up repeat the last name with a number: 8 is "Fruitful Tree 2". */
export const levelName = (level) =>
  level < LEVEL_NAMES.length ? LEVEL_NAMES[level] : `${LEVEL_NAMES[7]} ${level - 6}`;

/** @returns {{level: number, name: string, floor: number, next: number}} */
export function levelFor(xp) {
  let level = 0;
  while (levelFloor(level + 1) <= xp) level++;
  return { level, name: levelName(level), floor: levelFloor(level), next: levelFloor(level + 1) };
}

export const GARDEN_THRESHOLDS = [0, 50, 200, 500, 1000, 2000, 4000, 7000];

/** @returns {number} 0..7 */
export function gardenStage(xp) {
  return GARDEN_THRESHOLDS.filter((t) => t <= xp).length - 1;
}
