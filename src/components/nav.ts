import type { CSSProperties } from 'react';
import type { Palette } from '../theme';

export function navItemStyle(
  active: boolean,
  mobile: boolean,
  p: Palette,
): CSSProperties {
  if (mobile) {
    return {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
      border: 'none',
      background: 'none',
      cursor: 'pointer',
      fontSize: 10.5,
      fontWeight: 700,
      color: active ? p.accent : p.textFaint,
      padding: 0,
    };
  }
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '11px 12px',
    borderRadius: 11,
    border: 'none',
    background: active ? p.accentTintBg : 'transparent',
    color: active ? p.accentDeep : p.textMuted,
    fontWeight: active ? 800 : 600,
    fontSize: 15,
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
  };
}
