import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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

  it('opens Settings from its button', () => {
    const onOpenSettings = vi.fn();
    renderBar('/', onOpenSettings);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });
});
