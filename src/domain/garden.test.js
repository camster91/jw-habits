import { describe, it, expect } from 'vitest';
import { levelFor, gardenStage } from './garden.js';

describe('levelFor', () => {
  it('99 is Seed, 100 is Sprout', () => {
    expect(levelFor(99)).toMatchObject({ level: 0, name: 'Seed', floor: 0, next: 100 });
    expect(levelFor(100)).toMatchObject({ level: 1, name: 'Sprout', floor: 100, next: 300 });
  });
  it('names run to Fruitful Tree then number', () => {
    const names = [0, 100, 300, 600, 1000, 1500, 2100, 2800].map((x) => levelFor(x).name);
    expect(names).toEqual([
      'Seed',
      'Sprout',
      'Seedling',
      'Sapling',
      'Young Tree',
      'Flourishing Tree',
      'Cedar',
      'Fruitful Tree',
    ]);
    expect(levelFor((100 * 8 * 9) / 2)).toMatchObject({ level: 8, name: 'Fruitful Tree 2' });
    expect(levelFor(299).level).toBe(1);
  });
});

describe('gardenStage', () => {
  it('follows the thresholds', () => {
    expect(
      [0, 49, 50, 199, 200, 500, 1000, 2000, 4000, 6999, 7000, 99999].map(gardenStage)
    ).toEqual([0, 0, 1, 1, 2, 3, 4, 5, 6, 6, 7, 7]);
  });
});
