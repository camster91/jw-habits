import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/** Start a new screen at its heading; browser Back restores the previous position. */
export default function NavigationPosition({ enabled }) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const positions = useRef(new Map());

  useEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  useLayoutEffect(() => {
    if (!enabled) return;
    const saved = navigationType === 'POP' ? positions.current.get(location.key) : null;
    const top = saved ?? 0;
    let observer;
    const position = () => {
      const heading = document.querySelector('main h1');
      if (!heading) return false;
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
      window.scrollTo({ top, left: 0, behavior: 'instant' });
      return true;
    };
    // Lazy routes may initially contain only their loading message.
    if (!position()) {
      observer = new MutationObserver(() => {
        if (position()) observer.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
    const savedPositions = positions.current;
    return () => {
      observer?.disconnect();
      savedPositions.set(location.key, window.scrollY);
      // Retain recent history without an unbounded session map.
      if (savedPositions.size > 100) savedPositions.delete(savedPositions.keys().next().value);
    };
  }, [enabled, location.key, navigationType]);

  return null;
}
