import { describe, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
// eslint-disable-next-line no-unused-vars -- used via JSX
import { MemoryRouter } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars -- used via JSX
import TabBar from './TabBar.jsx';

const renderBar = (path, onOpenSettings = () => {}) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <TabBar onOpenSettings={onOpenSettings} />
    </MemoryRouter>
  );

describe('TabBar', () => {
  it('marks Today current on /', () => {
    renderBar('/');
    expect(screen.getByRole('link', { name: 'Today' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Progress' })).not.toHaveAttribute('aria-current');
  });

  it('marks Progress current on /progress', () => {
    renderBar('/progress');
    expect(screen.getByRole('link', { name: 'Progress' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Today' })).not.toHaveAttribute('aria-current');
  });

  it('lists Today, Plans and Progress in that order', () => {
    renderBar('/');
    expect(screen.getAllByRole('link').map((a) => a.textContent)).toEqual([
      'Today',
      'Plans',
      'Progress',
    ]);
  });

  it('marks Plans current on /plans and on a plan trail', () => {
    renderBar('/plans');
    expect(screen.getByRole('link', { name: 'Plans' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Today' })).not.toHaveAttribute('aria-current');
    cleanup();
    renderBar('/plans/abc');
    expect(screen.getByRole('link', { name: 'Plans' })).toHaveAttribute('aria-current', 'page');
  });

  it('opens Settings from its button', () => {
    const onOpenSettings = vi.fn();
    renderBar('/', onOpenSettings);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });
});
