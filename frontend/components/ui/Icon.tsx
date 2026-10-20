// Line icons, drawn for this game. Always decorative: the control that holds
// one carries its own accessible label.

const PATHS = {
  plus: <path d="M12 5v14M5 12h14" />,
  back: <path d="M15 5l-7 7 7 7" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  send: <path d="M5 12h14M13 6l6 6-6 6" />,
  home: <path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />,
  share: (
    <>
      <path d="M12 15V3M7 8l5-5 5 5" />
      <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="3" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2.5" />
      <circle cx="10" cy="17" r="2.5" />
    </>
  ),
  soundOn: (
    <>
      <path d="M4 9v6h4l5 4V5L8 9H4z" />
      <path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12" />
    </>
  ),
  soundOff: (
    <>
      <path d="M4 9v6h4l5 4V5L8 9H4z" />
      <path d="M17 9l4 6M21 9l-4 6" />
    </>
  ),
  chat: (
    <>
      <path d="M4 5h16v11H10l-5 4v-4H4z" />
      <path d="M8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01" strokeWidth="3" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </>
  ),
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}

/** The little bomb that marks whose turn it is. */
export function BombMark() {
  return (
    <svg viewBox="0 0 26 26" aria-hidden="true" focusable="false">
      <circle cx="11" cy="15" r="8.5" fill="#0b0a09" stroke="#f3ead7" strokeWidth="2" />
      <path d="M17 8 q3 -4 6 -2" fill="none" stroke="#f5b700" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function Crown() {
  return (
    <svg viewBox="0 0 58 40" aria-hidden="true" focusable="false">
      <path d="M5 34 L3 8 L17 20 L29 3 L41 20 L55 8 L53 34 Z" fill="#f5b700" stroke="#080706" strokeWidth="3.5" strokeLinejoin="round" />
    </svg>
  );
}

/** "Pass it on": bomb, arrow, player. Used in the how-to-play strip. */
export function PassIllustration() {
  return (
    <svg viewBox="0 0 84 34" width="84" height="34" aria-hidden="true" focusable="false">
      <circle cx="15" cy="20" r="11" fill="#0b0a09" stroke="#f3ead7" strokeWidth="2.5" />
      <path d="M22 12 q4 -6 8 -4" fill="none" stroke="#f5b700" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M36 20h18M48 14l6 6-6 6" fill="none" stroke="#a9a193" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="71" cy="20" r="11" fill="#8fb996" stroke="#080706" strokeWidth="2.5" />
    </svg>
  );
}
