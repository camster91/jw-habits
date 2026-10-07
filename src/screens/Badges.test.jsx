import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
// eslint-disable-next-line no-unused-vars -- JSX
import { MemoryRouter } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars -- JSX
import { StoreContext } from '../data/useStore.js';
import { defaultStore } from '../domain/store.js';
// eslint-disable-next-line no-unused-vars -- JSX
import Badges from './Badges.jsx';

describe('Badges', () => {
  it('shows all 18 milestones with earn dates and Not yet', () => {
    const store = { ...defaultStore('2026-10-07', 'en'), badges: { firstStep: '2026-10-06' } };
    render(
      <StoreContext.Provider value={{ store }}>
        <MemoryRouter>
          <Badges />
        </MemoryRouter>
      </StoreContext.Provider>
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(18);
    expect(screen.getByText('Earned 2026-10-06')).toBeInTheDocument();
    expect(screen.getAllByText('Not yet')).toHaveLength(17);
    expect(screen.getByRole('link', { name: 'Progress' })).toHaveAttribute('href', '/progress');
  });
});
