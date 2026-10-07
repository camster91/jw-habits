import { Bird, BookOpen, Footprints, Lamp, Mountain, Scroll, Sprout, Sun } from 'lucide-react';

/** The curated plan icons (store ids → plain line icons; nothing like a jw.org mark). */
const ICONS = {
  book: BookOpen,
  scroll: Scroll,
  lamp: Lamp,
  mountain: Mountain,
  seedling: Sprout,
  dove: Bird,
  sun: Sun,
  path: Footprints,
};

/** A plan's icon, decorative (the plan's title names it). Unknown ids show the book. */
export default function PlanIcon({ icon, className = 'h-5 w-5' }) {
  const Icon = ICONS[icon] ?? ICONS.book;
  return <Icon aria-hidden="true" className={className} />;
}
