import { useEffect, useState } from 'react';
import './confetti.css';

export default function Confetti() {
  const [visible, setVisible] = useState(
    () => !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const stop = () => {
      if (media?.matches) setVisible(false);
    };
    media?.addEventListener('change', stop);
    const timer = setTimeout(() => setVisible(false), 1800);
    return () => {
      clearTimeout(timer);
      media?.removeEventListener('change', stop);
    };
  }, []);
  if (!visible) return null;
  return (
    <div aria-hidden="true" data-testid="confetti" className="fd-confetti">
      {Array.from({ length: 16 }, (_, i) => (
        <i
          key={i}
          style={{
            left: `${i * 6}%`,
            animationDelay: `${(i % 4) * 80}ms`,
            background: ['#36754a', '#bc5579', '#d39a32'][i % 3],
          }}
        />
      ))}
    </div>
  );
}
