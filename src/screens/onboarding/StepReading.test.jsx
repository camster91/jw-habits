import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
// eslint-disable-next-line no-unused-vars -- used in JSX
import StepReading from './StepReading.jsx';
import { defaultStore } from '../../domain/store.js';
import { nextChapters } from '../../domain/bible.js';
let current;
// eslint-disable-next-line no-unused-vars -- used in JSX
function Harness() {
  const [store, change] = useState({
    ...defaultStore('2026-09-01', 'en'),
    log: [
      {
        routine: 'bibleReading',
        day: '2026-10-01',
        chapters: [{ book: 1, chapter: 8 }],
        value: true,
      },
    ],
  });
  current = store;
  return <StepReading store={store} change={change} today="2026-10-07" />;
}
it('keeps the read position and counting choice when only the pace changes', () => {
  render(<Harness />);
  const before = nextChapters(current, 1);
  fireEvent.click(screen.getByRole('radio', { name: /own pace/i }));
  expect(current.reading.plan).toBe('ownPace');
  expect(current.reading.startedOn).toBe('2026-09-01');
  expect(nextChapters(current, 1)).toEqual(before);
});
