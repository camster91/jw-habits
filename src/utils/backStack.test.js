import { describe, it, expect, vi } from 'vitest';
import { consumeBack, onBack } from './backStack.js';

describe('backStack', () => {
  it('is not consumed when nothing is open', () => {
    expect(consumeBack()).toBe(false);
  });

  it('runs only the most recent handler, and unsubscribing removes it', () => {
    const first = vi.fn();
    const second = vi.fn();
    const offFirst = onBack(first);
    const offSecond = onBack(second);
    expect(consumeBack()).toBe(true);
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
    offSecond();
    expect(consumeBack()).toBe(true);
    expect(first).toHaveBeenCalledTimes(1);
    offFirst();
    expect(consumeBack()).toBe(false);
  });
});
