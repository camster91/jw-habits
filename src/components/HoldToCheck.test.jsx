import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
// eslint-disable-next-line no-unused-vars -- used via JSX
import HoldToCheck from './HoldToCheck.jsx';
import { haptics } from '../utils/native.js';

vi.mock('../utils/native.js', () => ({ haptics: { success: vi.fn() } }));

function setup(props = {}) {
  const onComplete = vi.fn();
  const onUndo = vi.fn();
  render(
    <HoldToCheck
      done={false}
      onComplete={onComplete}
      onUndo={onUndo}
      label="Daily text"
      {...props}
    />
  );
  return { onComplete, onUndo, button: screen.getByRole('button', { name: /Daily text/ }) };
}

const advance = (ms) => act(() => vi.advanceTimersByTime(ms));

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('HoldToCheck', () => {
  it('does not complete when released after 300 ms', () => {
    const { onComplete, button } = setup();
    fireEvent.pointerDown(button);
    advance(300);
    fireEvent.pointerUp(button);
    advance(1000);
    expect(onComplete).not.toHaveBeenCalled();
    expect(haptics.success).not.toHaveBeenCalled();
  });

  it('completes after a 600 ms hold, with a haptic', () => {
    const { onComplete, button } = setup();
    fireEvent.pointerDown(button);
    advance(599);
    expect(onComplete).not.toHaveBeenCalled();
    advance(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(haptics.success).toHaveBeenCalledTimes(1);
  });

  it('cancels when the pointer leaves or is cancelled', () => {
    const { onComplete, button } = setup();
    fireEvent.pointerDown(button);
    advance(400);
    fireEvent.pointerLeave(button);
    fireEvent.pointerDown(button);
    advance(400);
    fireEvent.pointerCancel(button);
    advance(1000);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('honours a custom holdMs', () => {
    const { onComplete, button } = setup({ holdMs: 200 });
    fireEvent.pointerDown(button);
    advance(200);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('a plain tap on an open routine does nothing', () => {
    const { onComplete, onUndo, button } = setup();
    fireEvent.pointerDown(button);
    fireEvent.pointerUp(button);
    fireEvent.click(button);
    advance(1000);
    expect(onComplete).not.toHaveBeenCalled();
    expect(onUndo).not.toHaveBeenCalled();
  });

  it('tapping a done routine undoes it at once', () => {
    const { onUndo, onComplete, button } = setup({ done: true });
    fireEvent.pointerDown(button);
    fireEvent.pointerUp(button);
    fireEvent.click(button);
    expect(onUndo).toHaveBeenCalledTimes(1);
    advance(1000);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('the click that ends a completing hold does not undo it', () => {
    const onUndo = vi.fn();
    const { rerender } = render(
      <HoldToCheck done={false} onComplete={() => {}} onUndo={onUndo} label="Daily text" />
    );
    const button = screen.getByRole('button', { name: /Daily text/ });
    fireEvent.pointerDown(button);
    advance(600);
    rerender(<HoldToCheck done onComplete={() => {}} onUndo={onUndo} label="Daily text" />);
    fireEvent.pointerUp(button);
    fireEvent.click(button);
    expect(onUndo).not.toHaveBeenCalled();
    fireEvent.click(button);
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('completes at once on a click with no press before it (screen readers, switch, voice)', () => {
    const { onComplete, onUndo, button } = setup();
    fireEvent.click(button);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(haptics.success).toHaveBeenCalledTimes(1);
    expect(onUndo).not.toHaveBeenCalled();
  });

  it('a completing pointer hold fires once, its trailing click swallowed', () => {
    const { onComplete, button } = setup();
    fireEvent.pointerDown(button);
    advance(600);
    fireEvent.pointerUp(button);
    fireEvent.click(button);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(haptics.success).toHaveBeenCalledTimes(1);
  });

  it('a hold kept down well past completion does not undo itself on release', () => {
    const onComplete = vi.fn();
    const onUndo = vi.fn();
    const { rerender } = render(
      <HoldToCheck done={false} onComplete={onComplete} onUndo={onUndo} label="Daily text" />
    );
    const button = screen.getByRole('button', { name: /Daily text/ });
    fireEvent.pointerDown(button);
    advance(600);
    rerender(<HoldToCheck done onComplete={onComplete} onUndo={onUndo} label="Daily text" />);
    advance(2400); // still holding, 3 s in total
    fireEvent.pointerUp(button);
    fireEvent.click(button);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onUndo).not.toHaveBeenCalled();
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  it('a short keyboard tap whose keyup fires a click does not complete', () => {
    const { onComplete, button } = setup();
    fireEvent.keyDown(button, { key: ' ' });
    advance(200);
    fireEvent.keyUp(button, { key: ' ' });
    fireEvent.click(button);
    advance(1000);
    expect(onComplete).not.toHaveBeenCalled();
    expect(haptics.success).not.toHaveBeenCalled();
  });

  it('a keyboard hold completes once and swallows the click that follows', () => {
    const onComplete = vi.fn();
    const onUndo = vi.fn();
    const { rerender } = render(
      <HoldToCheck done={false} onComplete={onComplete} onUndo={onUndo} label="Daily text" />
    );
    const button = screen.getByRole('button', { name: /Daily text/ });
    fireEvent.keyDown(button, { key: ' ' });
    advance(600);
    rerender(<HoldToCheck done onComplete={onComplete} onUndo={onUndo} label="Daily text" />);
    fireEvent.keyUp(button, { key: ' ' });
    fireEvent.click(button);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(haptics.success).toHaveBeenCalledTimes(1);
    expect(onUndo).not.toHaveBeenCalled();
  });

  it('a stale press long ago does not swallow a later assistive click', () => {
    const { onComplete, button } = setup();
    fireEvent.pointerDown(button);
    fireEvent.pointerLeave(button);
    advance(5000);
    fireEvent.click(button);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('completes when Space or Enter is held for 600 ms', () => {
    const { onComplete, button } = setup();
    fireEvent.keyDown(button, { key: ' ' });
    advance(300);
    fireEvent.keyUp(button, { key: ' ' });
    advance(1000);
    expect(onComplete).not.toHaveBeenCalled();

    fireEvent.keyDown(button, { key: 'Enter' });
    fireEvent.keyDown(button, { key: 'Enter', repeat: true });
    advance(600);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(haptics.success).toHaveBeenCalledTimes(1);
  });

  it('Space or Enter on a done routine undoes it', () => {
    const { onUndo, button } = setup({ done: true });
    fireEvent.keyDown(button, { key: 'Enter' });
    fireEvent.keyDown(button, { key: 'Enter', repeat: true });
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('reports its state with aria-pressed and a large touch target', () => {
    const { button } = setup();
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button.className).toMatch(/min-h-11/);
    expect(button.className).toMatch(/min-w-11/);
  });

  it('is pressed when done', () => {
    setup({ done: true });
    expect(screen.getByRole('button', { name: /Daily text/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('stops a pending hold when unmounted', () => {
    const onComplete = vi.fn();
    const { unmount } = render(
      <HoldToCheck done={false} onComplete={onComplete} onUndo={() => {}} label="Daily text" />
    );
    fireEvent.pointerDown(screen.getByRole('button'));
    unmount();
    advance(1000);
    expect(onComplete).not.toHaveBeenCalled();
  });
});

describe('tap recording mode', () => {
  it('records a short pointer tap once', () => {
    const { button, onComplete } = setup({ tapToComplete: true });
    fireEvent.pointerDown(button);
    advance(100);
    fireEvent.pointerUp(button);
    fireEvent.click(button);
    advance(1000);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
  it.each(['Enter', ' '])('records keyboard %s without a second synthetic activation', (key) => {
    const { button, onComplete } = setup({ tapToComplete: true });
    fireEvent.keyDown(button, { key });
    fireEvent.keyUp(button, { key });
    fireEvent.click(button);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
  it('does not undo on release of a completed hold', () => {
    const { button, onComplete, onUndo } = setup({ tapToComplete: true });
    fireEvent.pointerDown(button);
    advance(600);
    fireEvent.pointerUp(button);
    fireEvent.click(button);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onUndo).not.toHaveBeenCalled();
  });
});
