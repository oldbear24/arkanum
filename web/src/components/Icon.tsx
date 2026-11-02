import type { CSSProperties } from 'react';

// Icon paths from the design, all on a 24 × 24 grid.
export const ICONS = {
  search: 'M16 16L20.5 20.5M11 4.5A6.5 6.5 0 1 0 11 17.5A6.5 6.5 0 1 0 11 4.5Z',
  plus: 'M12 5V19M5 12H19',
  minus: 'M6 12H18',
  plusSmall: 'M6 12H18M12 6V18',
  user: 'M12 4.7A3.8 3.8 0 1 0 12 12.3A3.8 3.8 0 1 0 12 4.7ZM4.5 20C5.6 16.4 8.5 14.5 12 14.5S18.4 16.4 19.5 20',
  arrowRight: 'M5 12H19M13 6L19 12L13 18',
  back: 'M15 5L8 12L15 19',
  cube: 'M12 3L20 7.5V16.5L12 21L4 16.5V7.5ZM4 7.5L12 12L20 7.5M12 12V21',
  cards: 'M7 3H17V21H7ZM3 6H5V18H3M19 6H21V18H19',
  sync: 'M20 12A8 8 0 0 1 6.3 17.7M4 12A8 8 0 0 1 17.7 6.3M18 3V6.5H14.5M6 21V17.5H9.5',
  check: 'M5 12.5L10 17L19 7',
  heart: 'M12 20C6 15.8 3.5 12.6 3.5 9.3C3.5 6.8 5.4 5 7.7 5C9.4 5 10.8 5.9 12 7.6C13.2 5.9 14.6 5 16.3 5C18.6 5 20.5 6.8 20.5 9.3C20.5 12.6 18 15.8 12 20Z',
  close: 'M6 6L18 18M18 6L6 18',
  undo: 'M9 7L4.5 11.5L9 16M5 11.5H14.5C17.5 11.5 19.5 13.5 19.5 16.5V18',
  redo: 'M15 7L19.5 11.5L15 16M19 11.5H9.5C6.5 11.5 4.5 13.5 4.5 16.5V18',
  eye: 'M2.5 12C4.8 7.8 8.1 5.5 12 5.5S19.2 7.8 21.5 12C19.2 16.2 15.9 18.5 12 18.5S4.8 16.2 2.5 12ZM12 9.2A2.8 2.8 0 1 0 12 14.8A2.8 2.8 0 1 0 12 9.2Z',
  eyeOff: 'M3 3L21 21M10.6 6.2C11 6.1 11.5 6 12 6C15.9 6 19.2 8.3 21.5 12C20.7 13.4 19.8 14.6 18.7 15.5M6.1 7.5C4.6 8.6 3.4 10.1 2.5 12C4.8 16.2 8.1 18.5 12 18.5C13.4 18.5 14.7 18.2 15.9 17.6',
  share: 'M12 15V4M7.5 8.5L12 4L16.5 8.5M5 13V19H19V13',
  upload: 'M12 16V4M7.5 8.5L12 4L16.5 8.5M5 14V20H19V14',
  rotate: 'M20 12A8 8 0 1 1 17.7 6.3M20 4V8H16',
  straighten: 'M4 12H20M12 4V20',
  sun: 'M12 8A4 4 0 1 0 12 16A4 4 0 1 0 12 8ZM12 2.5V5M12 19V21.5M2.5 12H5M19 12H21.5M5.3 5.3L7 7M17 17L18.7 18.7M5.3 18.7L7 17M17 7L18.7 5.3',
  star: 'M12 3L14.6 8.9L21 9.6L16.2 13.9L17.6 20.2L12 16.9L6.4 20.2L7.8 13.9L3 9.6L9.4 8.9Z',
  image: 'M4 5H20V19H4ZM4 16L9 11L13 15L16 12L20 16M15.5 8A1.5 1.5 0 1 0 15.5 8.1',
  card: 'M7 3H17V21H7Z',
  layers: 'M12 3L21 8L12 13L3 8ZM3 12L12 17L21 12M3 16L12 21L21 16',
  sparkle: 'M12 3L13.6 9.4L20 11L13.6 12.6L12 19L10.4 12.6L4 11L10.4 9.4Z',
  text: 'M5 6H19M12 6V19M9 19H15',
  frame: 'M4 4H20V20H4ZM8 8H16V16H8Z',
  palette: 'M12 3A9 9 0 1 0 12 21C13.4 21 14 20.2 14 19.3C14 18.1 13 17.6 13 16.6C13 15.6 13.8 15 14.8 15H17A4 4 0 0 0 21 11C21 6.6 17 3 12 3ZM7.5 11.5A1 1 0 1 0 7.5 11.6M10 7.5A1 1 0 1 0 10 7.6M15 7.5A1 1 0 1 0 15 7.6',
  book: 'M4 5H10C11.1 5 12 5.9 12 7V19C12 18.2 11.3 17.5 10.5 17.5H4ZM20 5H14C12.9 5 12 5.9 12 7V19C12 18.2 12.7 17.5 13.5 17.5H20Z',
  symbol: 'M12 3L14.5 9H21L15.8 12.8L17.8 19L12 15.2L6.2 19L8.2 12.8L3 9H9.5Z',
  ornament: 'M3 12C6 6 9 6 12 12C15 18 18 18 21 12',
  stats: 'M5 19V11M12 19V5M19 19V14',
  shape: 'M4 4H11V11H4ZM17 13.5A3.5 3.5 0 1 0 17 20.5A3.5 3.5 0 1 0 17 13.5ZM4 20L7.5 14L11 20Z',
  trash: 'M5 7H19M10 7V4.5H14V7M7 7L8 20H16L17 7',
  download: 'M12 4V16M7.5 11.5L12 16L16.5 11.5M5 20H19',
  link: 'M10 14A4 4 0 0 0 15.7 14L19 10.7A4 4 0 0 0 13.3 5L12 6.3M14 10A4 4 0 0 0 8.3 10L5 13.3A4 4 0 0 0 10.7 19L12 17.7',
  pencil: 'M4 20L5 15.5L16.5 4L20 7.5L8.5 19ZM14 6.5L17.5 10',
  chevronUp: 'M6 15L12 9L18 15',
  chevronDown: 'M6 9L12 15L18 9',
} as const;

export type IconName = keyof typeof ICONS;

interface IconProps {
  name?: IconName;
  /** A raw path, for icons that come from data. */
  path?: string;
  size?: number;
  strokeWidth?: number;
  fill?: string;
  style?: CSSProperties;
}

export function Icon({ name, path, size = 20, strokeWidth = 1.7, fill = 'none', style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <path d={path ?? (name ? ICONS[name] : '')} />
    </svg>
  );
}

export function DiscordMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 199" aria-hidden="true" style={{ display: 'block' }}>
      <path
        fill="#5865f2"
        d="M216.9 16.6A209 209 0 0 0 164 0c-2.2 4.1-4.9 9.6-6.7 14a194 194 0 0 0-58.6 0C97 9.6 94.2 4.1 92 0a208 208 0 0 0-53 16.6A222 222 0 0 0 1 165a211 211 0 0 0 65 33 161 161 0 0 0 13.8-22.8q-11.5-4.4-21.8-10.6l5.3-4.3a149 149 0 0 0 129.6 0q2.6 2.3 5.3 4.3a136 136 0 0 1-21.9 10.6q6 12 13.9 22.9a211 211 0 0 0 64.8-33.2c5.3-56.3-9-105.1-38-148.4M85.5 135.1c-12.7 0-23-11.8-23-26.2s10.1-26.2 23-26.2 23.2 11.8 23 26.2c0 14.4-10.2 26.2-23 26.2m85 0c-12.6 0-23-11.8-23-26.2s10.2-26.2 23-26.2 23.3 11.8 23 26.2c0 14.4-10.1 26.2-23 26.2"
      />
    </svg>
  );
}

export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" style={{ display: 'block' }}>
      <circle cx="16" cy="16" r="14.5" fill="none" stroke="#d6b067" strokeWidth="1.2" />
      <path d="M16 4.5L18.2 13.8L27.5 16L18.2 18.2L16 27.5L13.8 18.2L4.5 16L13.8 13.8Z" fill="#d6b067" />
      <circle cx="16" cy="16" r="2.2" fill="#0f0d1e" />
    </svg>
  );
}
