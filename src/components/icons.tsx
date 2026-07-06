// Inline icon set — 1.5px stroke, currentColor. No icon library.

type P = { size?: number };

// Coco monogram — a crafted "C" mark. Filled disc + inset counter so it reads
// as a considered logo, not a letter in a box. Used everywhere the brand shows.
export function Monogram({ size = 26 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect width="32" height="32" rx="9" fill="currentColor" />
      <path
        d="M22 11.4a7 7 0 100 9.2"
        fill="none"
        stroke="var(--accent-ink)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="21.4" cy="16" r="1.5" fill="var(--premium)" />
    </svg>
  );
}

function I({ size = 17, children }: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export const SparkIcon = (p: P) => (
  <I {...p}>
    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
    <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
  </I>
);

export const InboxIcon = (p: P) => (
  <I {...p}>
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5.5 5.1L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.5-6.9A2 2 0 0016.7 4H7.3a2 2 0 00-1.8 1.1z" />
  </I>
);

export const UsersIcon = (p: P) => (
  <I {...p}>
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </I>
);

export const CalendarIcon = (p: P) => (
  <I {...p}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </I>
);

export const BookIcon = (p: P) => (
  <I {...p}>
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
  </I>
);

export const PulseIcon = (p: P) => (
  <I {...p}>
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </I>
);

export const SearchIcon = (p: P) => (
  <I {...p}>
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </I>
);

export const SendIcon = (p: P) => (
  <I {...p}>
    <path d="M22 2L11 13" />
    <path d="M22 2l-7 20-4-9-9-4 20-7z" />
  </I>
);

export const LogoutIcon = (p: P) => (
  <I {...p}>
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
    <path d="M16 17l5-5-5-5M21 12H9" />
  </I>
);

export const BackIcon = (p: P) => (
  <I {...p}>
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </I>
);

export const CheckIcon = (p: P) => (
  <I {...p}>
    <path d="M20 6L9 17l-5-5" />
  </I>
);

export const AlertIcon = (p: P) => (
  <I {...p}>
    <path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
    <path d="M12 9v4M12 17h.01" />
  </I>
);

export const PlusIcon = (p: P) => (
  <I {...p}>
    <path d="M12 5v14M5 12h14" />
  </I>
);

export const TrashIcon = (p: P) => (
  <I {...p}>
    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
  </I>
);
