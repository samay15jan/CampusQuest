const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" };

export const ICONS = {
  map: <path d="m3 11 9-8 9 8v10h-6v-6H9v6H3Z" />,
  intel: <path d="M6 20V10M12 20V4M18 20v-7" />,
  scan: <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M9 12h6" />,
  user: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9c0-4 3-6 7-6s7 2 7 6" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  check: <path d="m5 12 5 5 9-10" />,
  flag: <path d="M5 21V4m0 0h11l-2 4 2 4H5" />,
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
  tower: <path d="m12 3 5 18H7l5-18Zm-3 12h6" />,
  shield: <path d="M12 3 4 7v6c0 4 3.5 6.5 8 8 4.5-1.5 8-4 8-8V7l-8-4Z" />,
  target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></>,
  bars: <path d="M5 20V9h4v11M10 20V4h4v16M15 20v-8h4v8" />,
  pin: <path d="M12 21s-6-5.6-6-10a6 6 0 1 1 12 0c0 4.4-6 10-6 10Zm0-8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />,
  back: <path d="M19 12H5m6-6-6 6 6 6" />,
  share: <path d="M12 3v12m0-12L8 7m4-4 4 4M5 13v6h14v-6" />,
  dots: <><circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" /></>,
  navigate: <path d="M12 3 5 21l7-4 7 4-7-18Z" />,
  clock: <><circle cx="12" cy="12" r="8" /><path d="M12 8v4l2.5 2" /></>,
  crystal: <path d="m12 2 6 6-6 14L6 8l6-6ZM6 8h12" />,
  layers: <path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5" />,
  camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4V8Z" /><circle cx="12" cy="13" r="3.5" /></>,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  bolt: <path d="M13 2 5 14h6l-1 8 8-12h-6l1-8Z" />,
  image: <><rect x="4" y="5" width="16" height="14" rx="2" /><circle cx="9" cy="10" r="1.5" /><path d="m4 17 5-5 4 4 3-3 4 4" /></>,
  ban: <><circle cx="12" cy="12" r="9" /><path d="m6 6 12 12" /></>,
  upload: <path d="M12 16V4m0 0L8 8m4-4 4 4M5 20h14" />,
  frame: <path d="M4 9V5h4M16 5h4v4M20 15v4h-4M8 19H4v-4M9 12h6" />,
  lock: <path d="M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16v4Zm9-13 4 4" />,
  crown: <path d="m3 8 4 4 5-7 5 7 4-4-2 11H5L3 8Z" />,
  clip: <path d="M9 4h6v3H9zM7 5H5v16h14V5h-2M9 12h6M9 16h6" />,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></>,
};

export default function Icon({ name, size = 20, className = "", style }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} {...stroke} className={className} style={style} aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}