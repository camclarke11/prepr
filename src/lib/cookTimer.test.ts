import { describe, expect, it } from 'vitest';
import { parseStepDuration, formatClock } from './cookTimer';

describe('parseStepDuration', () => {
  it('reads a single minute duration', () => {
    expect(parseStepDuration('Simmer 3 min, stirring.')).toBe(180);
    expect(parseStepDuration('Rest for 10 minutes.')).toBe(600);
  });

  it('takes the upper bound of a range (never undercook)', () => {
    expect(parseStepDuration('Brown the beef, 6–8 min.')).toBe(8 * 60);
    expect(parseStepDuration('Roast 20-25 min until cooked through.')).toBe(25 * 60);
  });

  it('handles hours', () => {
    expect(parseStepDuration('Braise for 2 hours.')).toBe(7200);
    expect(parseStepDuration('Chill 1 hr.')).toBe(3600);
  });

  it('ignores oven temperatures and other unitless numbers', () => {
    expect(parseStepDuration('Heat oven to 220°C / 425°F.')).toBeNull();
    expect(parseStepDuration('Add 2 eggs and a pinch of salt.')).toBeNull();
  });

  it('returns null when there is no duration', () => {
    expect(parseStepDuration('Cover and refrigerate overnight.')).toBeNull();
    expect(parseStepDuration('')).toBeNull();
  });
});

describe('formatClock', () => {
  it('formats minutes and seconds with a zero pad', () => {
    expect(formatClock(90)).toBe('1:30');
    expect(formatClock(5)).toBe('0:05');
    expect(formatClock(600)).toBe('10:00');
    expect(formatClock(3600)).toBe('60:00');
  });

  it('floors and clamps negatives to zero', () => {
    expect(formatClock(-5)).toBe('0:00');
    expect(formatClock(59.9)).toBe('0:59');
  });
});
