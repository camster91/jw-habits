import { describe, it, expect } from 'vitest';
import { drawCard } from './cards.js';
import { cardCopy } from './cardCopy.js';
import { defaultStore } from '../domain/store.js';
import i18n from 'i18next';
const t = i18n.t.bind(i18n);

describe('share cards', () => {
  it('builds a milestone and a weekly recap without notes or links', () => {
    expect(cardCopy('milestone', { title: 'reading the Gospels' }, t).title).toBe(
      'Finished reading the Gospels! 📖'
    );
    const store = defaultStore('2026-10-05', 'en');
    store.plans = [
      { title: 'Project', steps: [{ note: 'NOTE-SECRET', link: 'https://example.org/x' }] },
    ];
    store.log = Array.from({ length: 6 }, (_, i) => ({
      routine: 'dailyText',
      day: `2026-10-${String(5 + i).padStart(2, '0')}`,
      value: true,
    }));
    const weekly = cardCopy('weekly', { store, today: '2026-10-11' }, t);
    expect(weekly.lines).toContain('Daily text 6 days');
    for (const kind of ['milestone', 'weekly', 'garden', 'streak']) {
      const copy = cardCopy(
        kind,
        { store, today: '2026-10-11', title: 'Project', days: 6, streak: 2, showGameLayer: false },
        t
      );
      expect(JSON.stringify(copy)).not.toMatch(/NOTE-SECRET|https:|missed|broke|failed|lost/i);
    }
  });
  it('bounds every painted text line even with a long emoji title', () => {
    const painted = [];
    const ctx = {
      measureText: (s) => ({ width: Array.from(s).length * 40 }),
      fillText: (s) => painted.push(s),
      fillRect() {},
      beginPath() {},
      ellipse() {},
      fill() {},
      moveTo() {},
      lineTo() {},
      stroke() {},
    };
    const canvas = { getContext: () => ctx };
    drawCard(canvas, {
      kind: 'milestone',
      copy: { title: '🌱'.repeat(60), lines: ['x'.repeat(100)] },
    });
    expect(canvas.width).toBe(1080);
    expect(canvas.height).toBe(1350);
    expect(painted.slice(0, -1).every((s) => ctx.measureText(s).width <= 900)).toBe(true);
    expect(painted).not.toContain('');
  });
  it('omits level numbers when points are hidden', () => {
    expect(
      cardCopy('garden', { showGameLayer: false, level: 3, name: 'Sapling' }, t).lines
    ).toEqual([]);
  });
});
