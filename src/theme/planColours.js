/**
 * The eight plan colours (a plan's `colour` is an index into these). Each is a
 * fill that carries white text at 4.5:1 or better; text in a plan's colour
 * uses `planText`, the same shade rule as the accent (`textShade`).
 */
import { textShade } from './theme.js';

export const PLAN_COLOURS = [
  '#4A6FA4', // blue
  '#2E7D6B', // teal
  '#7B5EA7', // purple
  '#B5472F', // rust
  '#9A5B13', // amber
  '#B03A6E', // rose
  '#3D7A28', // green
  '#1F6E8C', // ocean
];

/** The names `fd.plans.colours.*` uses, in index order. */
export const PLAN_COLOUR_NAMES = [
  'blue',
  'teal',
  'purple',
  'rust',
  'amber',
  'rose',
  'green',
  'ocean',
];

/** The fill for a colour index (unknown falls back to the first). */
export const planColour = (index) => PLAN_COLOURS[index] ?? PLAN_COLOURS[0];

/** The colour as text in `mode`, at 4.5:1 on that theme's backgrounds. */
export const planText = (index, mode) => textShade(planColour(index), mode);

/**
 * Inline style for an element in a plan's colour: `--plan` (the fill) and
 * `--plan-text-light` / `--plan-text-dark`, which index.css picks between by
 * theme for the `fd-plan-text` class.
 */
export const planStyle = (index) => ({
  '--plan': planColour(index),
  '--plan-text-light': planText(index, 'light'),
  '--plan-text-dark': planText(index, 'dark'),
});
