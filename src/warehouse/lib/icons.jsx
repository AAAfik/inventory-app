// ═══════════════════════════════════════════════════════════════════
// icons.jsx — inline SVG line icons (no emoji, no dependency)
// Usage:  import { Icon } from "../lib/icons";
//         <Icon name="package" size={16} />
// Colour + stroke inherit from the parent via currentColor.
// ═══════════════════════════════════════════════════════════════════

const P = {
  // objects
  package:   <><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/></>,
  box:       <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M3 11h18M8 7V4h8v3"/></>,
  boxes:     <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
  wrench:    <path d="M14.7 6.3a4 4 0 105.4 5.4l-2.1-2.1 1.4-1.4 2.1 2.1a6 6 0 01-8.2-8.2l2.1 2.1-1.4 1.4-2.1-2.1zM11 11L3 19a2 2 0 003 3l8-8"/>,
  car:       <><path d="M5 17h14M6.5 17a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM20.5 17a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/><path d="M4 17v-4l2-5h12l2 5v4M6 13h12"/></>,
  factory:   <><path d="M3 21V10l5 3V10l5 3V6l8 5v10z"/><path d="M8 21v-4h4v4"/></>,
  warehouse: <><path d="M3 21V8l9-5 9 5v13"/><path d="M9 21v-6h6v6"/></>,
  bottle:    <><path d="M10 3h4v3l2 3v10a2 2 0 01-2 2h-4a2 2 0 01-2-2V9l2-3V3z"/><path d="M8 13h8"/></>,

  // actions
  plus:      <path d="M12 5v14M5 12h14"/>,
  minus:     <path d="M5 12h14"/>,
  arrowDown: <path d="M12 5v14M6 13l6 6 6-6"/>,
  arrowUp:   <path d="M12 19V5M6 11l6-6 6 6"/>,
  arrowRight:<path d="M5 12h14M13 6l6 6-6 6"/>,
  arrowLeft: <path d="M19 12H5M11 6l-6 6 6 6"/>,
  transfer:  <><path d="M7 7h13l-3-3M17 17H4l3 3"/></>,
  returnIn:  <><path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 015 5v6"/></>,
  edit:      <><path d="M4 20h4l10.5-10.5a2.1 2.1 0 00-3-3L5 17v3z"/><path d="M13.5 6.5l3 3"/></>,
  trash:     <><path d="M4 7h16M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/></>,
  close:     <path d="M6 6l12 12M18 6L6 18"/>,
  check:     <path d="M5 13l4 4L19 7"/>,
  refresh:   <><path d="M20 11a8 8 0 10-2.3 5.7"/><path d="M20 5v6h-6"/></>,
  search:    <><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/></>,
  print:     <><path d="M7 8V3h10v5"/><rect x="4" y="8" width="16" height="8" rx="2"/><path d="M7 16h10v5H7z"/></>,
  qr:        <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14h1M14 20h1M20 17v4h-3"/></>,
  camera:    <><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"/><circle cx="12" cy="13" r="3.2"/></>,
  scan:      <><path d="M4 8V6a2 2 0 012-2h2M16 4h2a2 2 0 012 2v2M20 16v2a2 2 0 01-2 2h-2M8 20H6a2 2 0 01-2-2v-2"/><path d="M4 12h16"/></>,
  ledger:    <><path d="M5 4h11l3 3v13H5z"/><path d="M8 9h8M8 13h8M8 17h5"/></>,
  clock:     <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></>,
  calendar:  <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></>,
  unlock:    <><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 017.5-2"/></>,
  bandage:   <><rect x="2.5" y="8.5" width="19" height="7" rx="3.5" transform="rotate(-45 12 12)"/><path d="M11 11h.01M13 13h.01M11 13h.01M13 11h.01"/></>,
  sparkle:   <path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4L12 3z"/>,
  note:      <><path d="M5 4h14v16H5z"/><path d="M9 9h6M9 13h6M9 17h3"/></>,
  comment:   <path d="M21 12a8 8 0 01-8 8H8l-4 3v-4.5A8 8 0 1121 12z"/>,
  money:     <><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 12h.01M18 12h.01"/></>,
  euro:      <><path d="M17 5a8 8 0 100 14"/><path d="M4 10h9M4 14h9"/></>,
  pin:       <><path d="M12 21s-7-6-7-11a7 7 0 1114 0c0 5-7 11-7 11z"/><circle cx="12" cy="10" r="2.6"/></>,
  user:      <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/></>,
  phone:     <path d="M6 3h3l2 5-2.5 1.5a12 12 0 006 6L16 13l5 2v3a2 2 0 01-2 2A16 16 0 014 5a2 2 0 012-2z"/>,
  home:      <><path d="M4 11l8-7 8 7v9a1 1 0 01-1 1h-5v-6h-4v6H5a1 1 0 01-1-1z"/></>,
  building:  <><rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/></>,
  mailbox:   <><path d="M3 12a5 5 0 0110 0v7H3z"/><path d="M13 19h7a1 1 0 001-1v-6a5 5 0 00-5-5h-3"/><path d="M17 7V4h2"/></>,

  // status
  alert:     <><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></>,
  warning:   <><path d="M10.3 4.3L2.6 17.4A2 2 0 004.3 20.4h15.4a2 2 0 001.7-3L13.7 4.3a2 2 0 00-3.4 0z"/><path d="M12 9v4M12 17h.01"/></>,
  checkCirc: <><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 10"/></>,
  shield:    <><path d="M12 3l8 3v6c0 4.5-3.3 7.9-8 9-4.7-1.1-8-4.5-8-9V6l8-3z"/><path d="M9 12.5l2 2 4-4"/></>,
  trendUp:   <><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></>,
  dot:       <circle cx="12" cy="12" r="4.5" />,
  chevron:   <path d="M9 6l6 6-6 6"/>,
  chevronDown: <path d="M6 9l6 6 6-6"/>,
};

export function Icon({ name, size = 16, sw = 1.75, style, title }) {
  const path = P[name];
  if (!path) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={name === 'dot' ? "currentColor" : "none"}
      stroke={name === 'dot' ? "none" : "currentColor"} strokeWidth={sw}
      strokeLinecap="round" strokeLinejoin="round"
      style={{flexShrink:0, display:"block", ...style}}
      role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      {path}
    </svg>
  );
}

// Asset kind → icon name
export const KIND_ICON = { equipment: 'factory', tool: 'wrench', vehicle: 'car' };

export default Icon;
