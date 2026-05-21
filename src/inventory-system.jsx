'use client';

/**
 * StockTrack — Resort Map (DATABASE view)
 * Caesar Projects · Afik Group
 *
 * React port of Caesar_Pool_Map_Editor-fixed.html — same data model, UX, and visual design.
 *
 * Setup:
 *   1. Place DJI aerial JPG at /public/resort-aerial.jpg
 *      (original IMG dims: 1536×1024 — use a similar aspect or change IMG_W/IMG_H)
 *   2. Drop this file at app/database/page.jsx  OR  components/inventory-system.jsx
 *   3. Inter font loads from Google Fonts via <link> — already injected below.
 *
 * Dependencies: react only. No tailwind, no icon libs.
 *
 * JSON compatibility: imports/exports the SAME shape as the original HTML editor
 *   { pools:[], buildings:[], fnb:[], office:[], facility:[] }
 *   each item: { name, x, y, onMap, locked }
 *
 * Brand color: var(--cs-primary) #7c5cff   ← Caesar purple
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const IMG_W = 1536;
const IMG_H = 1024;
const RESORT_MAP_IMAGE = '/resort-aerial.jpg';   // ← swap with your hosted DJI image URL
const STORAGE_KEY = 'caesar_map_v3';              // same key as HTML editor — auto-migrates existing data
const THEME_KEY   = 'caesar_theme';

const CATDEF = [
  { k: 'pool',     prop: 'pools',     label: 'Pools',                   dot: '#3ad0e7', box: '#3ad0e7', def: 'New Pool' },
  { k: 'bld',      prop: 'buildings', label: 'Buildings',               dot: '#7c5cff', box: '#7c5cff', def: 'New Building' },
  { k: 'fnb',      prop: 'fnb',       label: 'F&B (cafe / restaurant)', dot: '#f06363', box: '#f06363', def: 'New F&B' },
  { k: 'office',   prop: 'office',    label: 'Offices',                 dot: '#374151', box: '#374151', def: 'New Office' },
  { k: 'facility', prop: 'facility',  label: 'Facilities',              dot: '#26c281', box: '#26c281', def: 'New Facility' },
];
const CATBY = Object.fromEntries(CATDEF.map(c => [c.k, c]));

// Pre-seeded Caesar data (from the original HTML editor's DATA constant)
const INITIAL_DATA = {
  pools: [
    { name: 'Lucca Indoor Pool',    x: null, y: null, onMap: false, locked: false },
    { name: 'Lucca Pool',           x: null, y: null, onMap: false, locked: false },
    { name: 'Olympic Pool',         x: null, y: null, onMap: false, locked: false },
    { name: 'Pamukkale',            x: null, y: null, onMap: false, locked: false },
    { name: 'Aqua Pool',            x: null, y: null, onMap: false, locked: false },
    { name: 'Tropic (Sandy) Pool',  x: null, y: null, onMap: false, locked: false },
    { name: 'Lucius Pool',          x: null, y: null, onMap: false, locked: false },
    { name: 'Gallus',               x: null, y: null, onMap: false, locked: false },
    { name: 'Aspasianus',           x: null, y: null, onMap: false, locked: false },
    { name: 'Pantheon Indoor Pool', x: 575,  y: 558,  onMap: true,  locked: false },
    { name: 'Amelius Pool',         x: 686,  y: 697,  onMap: true,  locked: false },
    { name: 'Lagoon',               x: 600,  y: 452,  onMap: true,  locked: false },
    { name: 'Cafe Paris (Remus)',   x: null, y: null, onMap: false, locked: false },
    { name: 'Italus',               x: null, y: null, onMap: false, locked: false },
    { name: 'Didius',               x: null, y: null, onMap: false, locked: false },
    { name: 'Socrates',             x: null, y: null, onMap: false, locked: false },
    { name: 'Severus',              x: null, y: null, onMap: false, locked: false },
    { name: 'Lazy River (Nehir)',   x: 636,  y: 506,  onMap: true,  locked: false },
    { name: 'Romulus (Kids/Salt)',  x: null, y: null, onMap: false, locked: false },
    { name: 'Cyrus Pool',           x: null, y: null, onMap: false, locked: false },
    { name: 'Darius',               x: null, y: null, onMap: false, locked: false },
    { name: 'Lazy River Pool',      x: 516,  y: 616,  onMap: true,  locked: false },
  ],
  buildings: [
    { name: 'Marcellus',   x: 535.2, y: 405.3, onMap: true,  locked: false },
    { name: 'Cyrus',       x: 471.2, y: 454.8, onMap: true,  locked: false },
    { name: 'Vitus',       x: 610.7, y: 389.1, onMap: true,  locked: false },
    { name: 'Andreanius',  x: 710.2, y: 370.7, onMap: true,  locked: false },
    { name: 'Cornelius',   x: 729.3, y: 397.5, onMap: true,  locked: false },
    { name: 'Flavius',     x: 568.7, y: 439.0, onMap: true,  locked: false },
    { name: 'Aurelius',    x: 514.9, y: 512.5, onMap: true,  locked: false },
    { name: 'Spartacus',   x: 461.1, y: 586.0, onMap: true,  locked: false },
    { name: 'Marcus',      x: 605.1, y: 548.3, onMap: true,  locked: false },
    { name: 'Gallus',      x: 746.0, y: 496.0, onMap: true,  locked: false },
    { name: 'Lucius',      x: 864.3, y: 459.2, onMap: true,  locked: false },
    { name: 'Aspasianus',  x: 777.9, y: 524.3, onMap: true,  locked: false },
    { name: 'Neron',       x: 713.1, y: 597.7, onMap: true,  locked: false },
    { name: 'Amelius',     x: 614.0, y: 710.4, onMap: true,  locked: false },
    { name: 'Tiberius',    x: 396.0, y: 667.4, onMap: true,  locked: false },
    { name: 'Rufus',       x: 356.8, y: 743.8, onMap: true,  locked: false },
    { name: 'Alexius',     x: 332.3, y: 815.1, onMap: true,  locked: false },
    { name: 'Commodus',    x: 424.6, y: 791.2, onMap: true,  locked: false },
    { name: 'Liberius',    x: null, y: null, onMap: false, locked: false },
    { name: 'Maximus',     x: null, y: null, onMap: false, locked: false },
    { name: 'Octavius',    x: null, y: null, onMap: false, locked: false },
    { name: 'Marius',      x: null, y: null, onMap: false, locked: false },
    { name: 'Julius',      x: null, y: null, onMap: false, locked: false },
    { name: 'Constantine', x: null, y: null, onMap: false, locked: false },
    { name: 'Claudius',    x: null, y: null, onMap: false, locked: false },
    { name: 'Claudia',     x: null, y: null, onMap: false, locked: false },
    { name: 'Cassius',     x: null, y: null, onMap: false, locked: false },
    { name: 'Brutus',      x: null, y: null, onMap: false, locked: false },
    { name: 'Augustus',    x: null, y: null, onMap: false, locked: false },
  ],
  fnb: [],
  office: [],
  facility: [],
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID
  ? crypto.randomUUID()
  : Math.random().toString(36).slice(2));

// Attach internal IDs (kept off the export shape for backward compat)
function withIds(state) {
  const out = {};
  for (const c of CATDEF) {
    out[c.prop] = (state[c.prop] || []).map(it => ({ _id: uid(), ...it }));
  }
  return out;
}
function stripIds(state) {
  const out = {};
  for (const c of CATDEF) {
    out[c.prop] = (state[c.prop] || []).map(({ _id, ...rest }) => rest);
  }
  return out;
}
function normalizeLoaded(o) {
  const out = {};
  for (const c of CATDEF) {
    const arr = Array.isArray(o?.[c.prop]) ? o[c.prop] : [];
    out[c.prop] = arr
      .filter(it => it && typeof it === 'object' && typeof it.name === 'string')
      .map(it => ({
        _id: uid(),
        name: String(it.name),
        x: typeof it.x === 'number' ? it.x : null,
        y: typeof it.y === 'number' ? it.y : null,
        onMap: !!it.onMap && typeof it.x === 'number' && typeof it.y === 'number',
        locked: !!it.locked,
      }));
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function InventorySystem() {
  // ── persistent state ───────────────────────────────────────────
  const [data, setData] = useState(() => withIds(INITIAL_DATA));
  const [layers, setLayers] = useState({ pool: true, bld: true, fnb: true, office: true, facility: true });
  const [theme, setTheme] = useState('light');
  const [hydrated, setHydrated] = useState(false);

  // ── transient UI state ─────────────────────────────────────────
  const [t, setT] = useState({ s: 1, tx: 0, ty: 0 });
  const [activeSheet, setActiveSheet] = useState(null);
  const [editing, setEditing] = useState(null);
  const [placing, setPlacing] = useState(null);
  const [toast, setToast] = useState('');
  const [sync, setSync] = useState('synced');
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [, forceRerender] = useState(0);

  // ── refs ────────────────────────────────────────────────────────
  const vpRef = useRef(null);
  const imgRef = useRef(null);
  const fileInputRef = useRef(null);
  const draggingPin = useRef(null);
  const panRef = useRef(null);
  const pinchRef = useRef(null);
  const toastTimerRef = useRef(null);
  const saveTimerRef = useRef(null);

  // ── load on mount ──────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setData(normalizeLoaded(parsed));
      }
      const savedTheme = localStorage.getItem(THEME_KEY);
      if (savedTheme === 'dark') setTheme('dark');
    } catch (e) { /* ignore */ }
    setHydrated(true);
  }, []);

  // ── save with sync indicator ───────────────────────────────────
  useEffect(() => {
    if (!hydrated) return;
    setSync('saving');
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stripIds(data)));
        setSync('synced');
      } catch (e) {
        setSync('error');
      }
    }, 400);
    return () => clearTimeout(saveTimerRef.current);
  }, [data, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
  }, [theme, hydrated]);

  // ── helpers ────────────────────────────────────────────────────
  const showToast = useCallback((m) => {
    setToast(m);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(''), 1700);
  }, []);

  const updateItem = useCallback((catKey, id, patch) => {
    setData(d => ({
      ...d,
      [CATBY[catKey].prop]: d[CATBY[catKey].prop].map(it => it._id === id ? { ...it, ...patch } : it),
    }));
  }, []);
  const removeItem = useCallback((catKey, id) => {
    setData(d => ({
      ...d,
      [CATBY[catKey].prop]: d[CATBY[catKey].prop].filter(it => it._id !== id),
    }));
  }, []);
  const addItem = useCallback((catKey) => {
    const c = CATBY[catKey];
    const it = { _id: uid(), name: c.def, x: null, y: null, onMap: false, locked: false };
    setData(d => ({ ...d, [c.prop]: [...d[c.prop], it] }));
    return it;
  }, []);

  // ── transform ──────────────────────────────────────────────────
  const fit = useCallback(() => {
    const vp = vpRef.current; if (!vp) return;
    const w = vp.clientWidth, h = vp.clientHeight;
    const s = Math.min(w / IMG_W, h / IMG_H) * 0.96;
    setT({ s, tx: (w - IMG_W * s) / 2, ty: (h - IMG_H * s) / 2 });
  }, []);

  const fitContent = useCallback(() => {
    const vp = vpRef.current; if (!vp) return;
    const pts = [];
    CATDEF.forEach(c => {
      if (layers[c.k]) data[c.prop].filter(it => it.onMap).forEach(it => pts.push(it));
    });
    if (!pts.length) { fit(); return; }
    let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    pts.forEach(p => { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); });
    const padL = 70, padR = 190, padT = 70, padB = 90;
    const bw = (maxX - minX) + padL + padR, bh = (maxY - minY) + padT + padB;
    const w = vp.clientWidth, h = vp.clientHeight;
    const s = clamp(Math.min(w / bw, h / bh), 0.12, 2.2);
    const cx = (minX - padL + maxX + padR) / 2, cy = (minY - padT + maxY + padB) / 2;
    setT({ s, tx: w / 2 - cx * s, ty: h / 2 - cy * s });
  }, [data, layers, fit]);

  const zoomAt = useCallback((mx, my, f) => {
    setT(prev => {
      const ns = clamp(prev.s * f, 0.12, 7);
      return { s: ns, tx: mx - (mx - prev.tx) * ns / prev.s, ty: my - (my - prev.ty) * ns / prev.s };
    });
  }, []);

  useEffect(() => {
    if (imgLoaded) requestAnimationFrame(fitContent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgLoaded]);

  // ── wheel zoom (non-passive) ────────────────────────────────────
  useEffect(() => {
    const vp = vpRef.current; if (!vp) return;
    const onWheel = (e) => {
      e.preventDefault();
      const r = vp.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.12 : 1 / 1.12);
    };
    vp.addEventListener('wheel', onWheel, { passive: false });
    return () => vp.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  // ── touch pinch ─────────────────────────────────────────────────
  useEffect(() => {
    const vp = vpRef.current; if (!vp) return;
    const onTouchStart = (e) => {
      if (e.touches.length >= 2) {
        const a = e.touches[0], b = e.touches[1];
        pinchRef.current = { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) };
        panRef.current = null;
        draggingPin.current = null;
      }
    };
    const onTouchMove = (e) => {
      if (e.touches.length >= 2 && pinchRef.current) {
        e.preventDefault();
        const a = e.touches[0], b = e.touches[1];
        const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        const r = vp.getBoundingClientRect();
        const mx = (a.clientX + b.clientX) / 2 - r.left, my = (a.clientY + b.clientY) / 2 - r.top;
        if (pinchRef.current.d) zoomAt(mx, my, d / pinchRef.current.d);
        pinchRef.current.d = d;
      }
    };
    const onTouchEnd = (e) => { if (e.touches.length < 2) pinchRef.current = null; };
    vp.addEventListener('touchstart', onTouchStart, { passive: false });
    vp.addEventListener('touchmove',  onTouchMove,  { passive: false });
    vp.addEventListener('touchend',   onTouchEnd);
    return () => {
      vp.removeEventListener('touchstart', onTouchStart);
      vp.removeEventListener('touchmove',  onTouchMove);
      vp.removeEventListener('touchend',   onTouchEnd);
    };
  }, [zoomAt]);

  // ── pan ─────────────────────────────────────────────────────────
  const onVpPointerDown = (e) => {
    if (e.target.closest('.cs-pin')) return;
    panRef.current = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false };
    setActiveSheet(null);
  };
  const onVpPointerMove = (e) => {
    if (!panRef.current || pinchRef.current || draggingPin.current) return;
    const p = panRef.current;
    if (!p.moved && Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > 6) p.moved = true;
    setT(prev => ({ ...prev, tx: prev.tx + (e.clientX - p.x), ty: prev.ty + (e.clientY - p.y) }));
    p.x = e.clientX; p.y = e.clientY;
  };
  const onVpPointerUp = (e) => {
    if (panRef.current && !panRef.current.moved && !pinchRef.current && placing) {
      placeAt(e.clientX, e.clientY);
    }
    panRef.current = null;
  };

  // ── placing ─────────────────────────────────────────────────────
  const placeAt = (clientX, clientY) => {
    const vp = vpRef.current; if (!vp || !placing) return;
    const r = vp.getBoundingClientRect();
    const x = clamp((clientX - r.left - t.tx) / t.s, 0, IMG_W);
    const y = clamp((clientY - r.top  - t.ty) / t.s, 0, IMG_H);
    const wasNew = placing.isNew;
    const cat = placing.catKey, id = placing.id;
    updateItem(cat, id, { x, y, onMap: true });
    setPlacing(null);
    if (wasNew) setTimeout(() => setEditing({ catKey: cat, id }), 50);
    else showToast('Placed');
  };
  const cancelPlacing = () => {
    if (!placing) return;
    if (placing.isNew) removeItem(placing.catKey, placing.id);
    setPlacing(null);
    showToast('Cancelled');
  };
  const startPlacing = (catKey, id, isNew) => {
    setPlacing({ catKey, id, isNew });
    setActiveSheet(null);
  };

  // ── pin drag ────────────────────────────────────────────────────
  const onPinPointerDown = (e, catKey, id, item) => {
    e.stopPropagation();
    draggingPin.current = { catKey, id, moved: false, sx: e.clientX, sy: e.clientY, locked: !!item.locked };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
  };
  const onPinPointerMove = (e) => {
    const dp = draggingPin.current; if (!dp || dp.locked) return;
    if (!dp.moved && Math.hypot(e.clientX - dp.sx, e.clientY - dp.sy) < 6) return;
    if (!dp.moved) { dp.moved = true; forceRerender(n => n + 1); }
    const vp = vpRef.current;
    const r = vp.getBoundingClientRect();
    const x = clamp((e.clientX - r.left - t.tx) / t.s, 0, IMG_W);
    const y = clamp((e.clientY - r.top  - t.ty) / t.s, 0, IMG_H);
    updateItem(dp.catKey, dp.id, { x, y });
  };
  const onPinPointerUp = () => {
    const dp = draggingPin.current;
    if (!dp) return;
    if (!dp.moved) setEditing({ catKey: dp.catKey, id: dp.id });
    draggingPin.current = null;
    forceRerender(n => n + 1);
  };

  const toggleLayer = (k) => setLayers(l => ({ ...l, [k]: !l[k] }));

  // ── editor ──────────────────────────────────────────────────────
  const editingItem = editing
    ? data[CATBY[editing.catKey].prop].find(it => it._id === editing.id)
    : null;

  const editorSave = (newName) => {
    if (!editing) return;
    const v = (newName ?? '').trim();
    if (!v) { showToast('Name cannot be empty'); return; }
    updateItem(editing.catKey, editing.id, { name: v });
    setEditing(null);
  };
  const editorToggleLock = () => {
    if (!editing || !editingItem) return;
    const next = !editingItem.locked;
    updateItem(editing.catKey, editing.id, { locked: next });
    setEditing(null);
    showToast(next ? 'Locked' : 'Unlocked');
  };
  const editorRemoveFromMap = () => {
    if (!editing) return;
    updateItem(editing.catKey, editing.id, { x: null, y: null, onMap: false, locked: false });
    setEditing(null);
    showToast('Moved to list');
  };

  // ── export / import ─────────────────────────────────────────────
  const downloadBlob = (blob, name) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(stripIds(data), null, 2)], { type: 'application/json' });
    downloadBlob(blob, 'caesar_pool_map.json');
    setActiveSheet(null);
    showToast('JSON saved');
  };

  const onImportFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const o = JSON.parse(r.result);
        if (!o || typeof o !== 'object' || (!Array.isArray(o.pools) && !Array.isArray(o.buildings))) {
          showToast('Invalid file structure'); return;
        }
        setData(normalizeLoaded(o));
        setActiveSheet(null);
        showToast('Loaded');
        setTimeout(fitContent, 50);
      } catch (err) { showToast('Invalid file'); }
    };
    r.readAsText(f);
    e.target.value = '';
  };

  const resetToOriginal = () => {
    if (!confirm('Reset all names and positions to the original?')) return;
    setData(withIds(INITIAL_DATA));
    setLayers({ pool: true, bld: true, fnb: true, office: true, facility: true });
    setPlacing(null);
    setActiveSheet(null);
    setTimeout(fitContent, 50);
    showToast('Reset done');
  };

  const exportPNG = () => {
    const img = imgRef.current;
    if (!img || !img.complete) { showToast('Image not ready'); return; }
    const cw = img.naturalWidth, ch = img.naturalHeight;
    const k = cw / IMG_W;
    const cv = document.createElement('canvas');
    cv.width = cw; cv.height = ch;
    const g = cv.getContext('2d');
    try {
      g.drawImage(img, 0, 0, cw, ch);
    } catch (err) {
      showToast('PNG export blocked by CORS'); return;
    }
    g.textBaseline = 'middle'; g.lineJoin = 'round';
    const FS = 22, pad = 7, dotR = 8;
    const drawRR = (x, y, w, h, r) => {
      g.beginPath();
      g.moveTo(x + r, y);
      g.arcTo(x + w, y, x + w, y + h, r);
      g.arcTo(x + w, y + h, x, y + h, r);
      g.arcTo(x, y + h, x, y, r);
      g.arcTo(x, y, x + w, y, r);
      g.closePath();
    };
    CATDEF.forEach(c => {
      if (!layers[c.k]) return;
      data[c.prop].filter(it => it.onMap).forEach(it => {
        const x = it.x * k, y = it.y * k;
        g.font = `600 ${FS}px ui-sans-serif, "Inter", Segoe UI, Roboto, sans-serif`;
        const tw = g.measureText(it.name).width;
        const bx = x + 13, by = y - (FS / 2 + pad), bw = tw + pad * 2, bh = FS + pad * 2;
        g.beginPath(); g.arc(x, y, dotR, 0, Math.PI * 2);
        g.fillStyle = c.dot; g.fill();
        g.lineWidth = 2.5; g.strokeStyle = '#fff'; g.stroke();
        drawRR(bx, by, bw, bh, 8);
        g.fillStyle = c.box; g.fill();
        g.lineWidth = 1.6; g.strokeStyle = 'rgba(255,255,255,.65)'; g.stroke();
        g.fillStyle = '#fff'; g.fillText(it.name, bx + pad, by + bh / 2 + 1);
      });
    });
    cv.toBlob(b => {
      downloadBlob(b, 'caesar_map.png');
      setActiveSheet(null);
      showToast('PNG exported');
    }, 'image/png');
  };

  // ── derived ─────────────────────────────────────────────────────
  const allPins = useMemo(() => {
    const out = [];
    CATDEF.forEach(c => {
      if (!layers[c.k]) return;
      data[c.prop].filter(it => it.onMap).forEach(it => {
        out.push({ ...it, catKey: c.k, _cat: c });
      });
    });
    return out;
  }, [data, layers]);

  const unplacedByCat = useMemo(() => {
    const out = [];
    let total = 0;
    CATDEF.forEach(c => {
      const items = data[c.prop].filter(it => !it.onMap);
      if (items.length) { out.push({ cat: c, items }); total += items.length; }
    });
    return { groups: out, total };
  }, [data]);

  // ────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────
  return (
    <div className={`cs-root ${theme === 'dark' ? 'cs-dark' : ''}`}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* Top bar */}
      <div className="cs-bar">
        <div className="cs-logo">C</div>
        <div className="cs-titleblock">
          <div className="cs-title">Caesar Resort</div>
          <div className="cs-sub"><span className="cs-live" />StockTrack · Database</div>
        </div>
        <div className="cs-spacer" />

        <SyncBadge status={sync} />

        <div className="cs-zoom">
          <button onClick={() => { const vp = vpRef.current; zoomAt(vp.clientWidth / 2, vp.clientHeight / 2, 1 / 1.25); }}>−</button>
          <span className="cs-z">{Math.round(t.s * 100)}%</span>
          <button onClick={() => { const vp = vpRef.current; zoomAt(vp.clientWidth / 2, vp.clientHeight / 2, 1.25); }}>+</button>
          <button onClick={fitContent} style={{ fontSize: 12, width: 'auto', padding: '0 10px', fontWeight: 600 }}>Fit</button>
        </div>
        <button className="cs-themeBtn" onClick={() => setTheme(th => th === 'dark' ? 'light' : 'dark')} title="Toggle theme">
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </div>

      {/* Viewport */}
      <div
        className={`cs-viewport ${placing ? 'cs-placing' : ''}`}
        ref={vpRef}
        onPointerDown={onVpPointerDown}
        onPointerMove={onVpPointerMove}
        onPointerUp={onVpPointerUp}
        onPointerLeave={() => { panRef.current = null; }}
        onPointerCancel={() => { panRef.current = null; }}
      >
        <div
          className="cs-content"
          style={{ width: IMG_W, height: IMG_H, transform: `translate(${t.tx}px,${t.ty}px) scale(${t.s})` }}
        >
          <img
            ref={imgRef}
            src={RESORT_MAP_IMAGE}
            alt="Caesar Resort aerial"
            crossOrigin="anonymous"
            draggable={false}
            onLoad={() => { setImgLoaded(true); setImgFailed(false); }}
            onError={() => { setImgFailed(true); setImgLoaded(false); }}
          />
        </div>

        {/* Pins overlay (positioned in viewport space, not inside transformed content,
            so click hit areas don't scale with zoom) */}
        <div className="cs-pins">
          {allPins.map(p => {
            const left = t.tx + p.x * t.s;
            const top  = t.ty + p.y * t.s;
            const isDragging = draggingPin.current?.id === p._id && draggingPin.current?.moved;
            return (
              <div
                key={p._id}
                className={`cs-pin cs-pin-${p.catKey}${p.locked ? ' cs-locked' : ''}${isDragging ? ' cs-dragging' : ''}`}
                style={{ left, top }}
                onPointerDown={(e) => onPinPointerDown(e, p.catKey, p._id, p)}
                onPointerMove={onPinPointerMove}
                onPointerUp={onPinPointerUp}
                onPointerCancel={() => { draggingPin.current = null; }}
              >
                <span className="cs-hit" />
                <span className="cs-dot" style={{ background: p._cat.dot }} />
                <span className="cs-lbl" style={{ background: p._cat.box }}>
                  {p.locked && <span style={{ marginRight: 1 }}>🔒 </span>}
                  {p.name}
                </span>
              </div>
            );
          })}
        </div>

        {imgFailed && (
          <div className="cs-imgmissing">
            <div className="cs-imgmissing-card">
              <div className="cs-imgmissing-title">DJI aerial image not found</div>
              <div className="cs-imgmissing-body">
                Drop the photo at <code>/public/resort-aerial.jpg</code> or change <code>RESORT_MAP_IMAGE</code> at the top of <code>inventory-system.jsx</code>.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="cs-legend">
        {CATDEF.map(c => (
          <span key={c.k} style={{ opacity: layers[c.k] ? 1 : 0.35 }}>
            <i style={{ background: c.dot }} />
            {c.label.replace(' (cafe / restaurant)', '')}
          </span>
        ))}
      </div>

      {/* Bottom dock */}
      <div className="cs-dock">
        <button className="cs-dbtn" onClick={() => setActiveSheet(s => s === 'layers' ? null : 'layers')}>
          <span className="cs-ic">◑</span><span className="cs-lbltext">Layers</span>
        </button>
        <button className="cs-dbtn cs-accent" onClick={() => setActiveSheet(s => s === 'add' ? null : 'add')}>
          <span className="cs-ic">＋</span><span className="cs-lbltext">Add</span>
        </button>
        <button className="cs-dbtn" onClick={() => setActiveSheet(s => s === 'list' ? null : 'list')}>
          <span className="cs-ic">☰</span><span className="cs-lbltext">List</span>
          {unplacedByCat.total > 0 && <span className="cs-listBadge">{unplacedByCat.total}</span>}
        </button>
        <button className="cs-dbtn" onClick={() => setActiveSheet(s => s === 'menu' ? null : 'menu')}>
          <span className="cs-ic">⋯</span>
        </button>
      </div>

      {/* Sheets */}
      <Sheet open={activeSheet === 'list'} onClose={() => setActiveSheet(null)}>
        <h3>↪ Unplaced items <span className="cs-c">{unplacedByCat.total}</span></h3>
        <div className="cs-listBody">
          {unplacedByCat.total === 0 ? (
            <div className="cs-empty">Everything is placed ✓</div>
          ) : (
            unplacedByCat.groups.map(group => (
              <div key={group.cat.k}>
                <div className="cs-sec">{group.cat.label}</div>
                {group.items.map(it => (
                  <div key={it._id} className="cs-chip" onClick={() => startPlacing(group.cat.k, it._id, false)}>
                    <span className="cs-pdot" style={{ background: group.cat.dot }} />
                    <span className="cs-nm">{it.name}</span>
                    <span className="cs-go">tap to place ▸</span>
                    <button
                      className="cs-chipDel"
                      title="Delete forever"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        if (confirm(`Delete "${it.name}" permanently?`)) {
                          if (placing?.id === it._id) setPlacing(null);
                          removeItem(group.cat.k, it._id);
                          showToast('Deleted');
                        }
                      }}
                    >×</button>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </Sheet>

      <Sheet open={activeSheet === 'add'} onClose={() => setActiveSheet(null)}>
        <h3>Add new</h3>
        {CATDEF.map(c => (
          <div key={c.k} className="cs-mItem" onClick={() => {
            const it = addItem(c.k);
            startPlacing(c.k, it._id, true);
          }}>
            <i className="cs-ldot" style={{ background: c.dot }} />
            <span style={{ flex: 1 }}>
              New {c.label.toLowerCase().replace(/s$/, '').replace(' (cafe / restaurant)', '')}
            </span>
          </div>
        ))}
      </Sheet>

      <Sheet open={activeSheet === 'layers'} onClose={() => setActiveSheet(null)}>
        <h3>Layers <span style={{ fontSize: 12, color: 'var(--cs-muted)', fontWeight: 500, marginLeft: 6 }}>tap to show / hide</span></h3>
        <div>
          {CATDEF.map(c => {
            const on = layers[c.k];
            return (
              <div key={c.k} className="cs-mItem" onClick={() => toggleLayer(c.k)}>
                <i className="cs-ldot" style={{ background: c.dot }} />
                <span style={{ flex: 1 }}>{c.label}</span>
                <span className="cs-pill" style={{
                  background: on ? 'rgba(38,194,129,.15)' : 'var(--cs-bg)',
                  color: on ? '#26c281' : 'var(--cs-muted)',
                }}>{on ? 'On' : 'Off'}</span>
              </div>
            );
          })}
        </div>
      </Sheet>

      <Sheet open={activeSheet === 'menu'} onClose={() => setActiveSheet(null)}>
        <h3>Options</h3>
        <div className="cs-mItem" onClick={exportPNG}><span className="cs-ic">⬇</span> Export image (PNG)</div>
        <div className="cs-mItem" onClick={exportJSON}><span className="cs-ic">⬇</span> Save data (JSON)</div>
        <div className="cs-mItem" onClick={() => fileInputRef.current?.click()}><span className="cs-ic">⬆</span> Load data (JSON)</div>
        <div className="cs-mItem cs-danger" onClick={resetToOriginal}><span className="cs-ic">↺</span> Reset to original</div>
        <input ref={fileInputRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={onImportFile} />
      </Sheet>

      {/* Editor modal */}
      {editing && editingItem && (
        <Editor
          item={editingItem}
          catLabel={CATBY[editing.catKey].label.replace(/s$/, '').replace(' (cafe / restaurant)', '')}
          onSave={editorSave}
          onClose={() => setEditing(null)}
          onToggleLock={editorToggleLock}
          onRemove={editorRemoveFromMap}
        />
      )}

      {/* Placing banner */}
      {placing && (() => {
        const it = data[CATBY[placing.catKey].prop].find(x => x._id === placing.id);
        if (!it) return null;
        return (
          <div className="cs-placingBanner cs-show">
            <span className="cs-ptxt">Tap on the map to place "{it.name}"</span>
            <button className="cs-pcancel" onClick={cancelPlacing} title="Cancel">×</button>
          </div>
        );
      })()}

      {/* Toast */}
      <div className={`cs-toast ${toast ? 'cs-show' : ''}`}>{toast}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function SyncBadge({ status }) {
  const label = status === 'saving' ? 'Saving…' : status === 'error' ? 'Save failed' : 'Saved';
  return (
    <div className={`cs-sync cs-sync-${status}`} title={label}>
      <span className="cs-sync-dot" />
      <span className="cs-sync-txt">{label}</span>
    </div>
  );
}

function Sheet({ open, onClose, children }) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  return (
    <div className={`cs-sheet ${open ? 'cs-open' : ''}`} onPointerDown={(e) => e.stopPropagation()}>
      <div className="cs-grab" />
      {children}
    </div>
  );
}

function Editor({ item, catLabel, onSave, onClose, onToggleLock, onRemove }) {
  const [name, setName] = useState(item.name);
  const inputRef = useRef(null);
  useEffect(() => {
    setName(item.name);
    setTimeout(() => inputRef.current?.focus(), 40);
  }, [item]);
  return (
    <>
      <div className="cs-backdrop" onClick={onClose} />
      <div className="cs-editor">
        <h4>{catLabel} name</h4>
        <input
          ref={inputRef}
          className="cs-edName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onSave(name); } }}
          autoComplete="off"
          autoCapitalize="words"
        />
        <div className="cs-edrow">
          <button className="cs-edbtn cs-save" onClick={() => onSave(name)}>Save</button>
          <button className="cs-edbtn" onClick={onClose}>Close</button>
        </div>
        <div className="cs-edrow">
          <button className="cs-edbtn" onClick={onToggleLock}>
            {item.locked ? '🔓 Unlock' : '🔒 Lock'}
          </button>
        </div>
        <div className="cs-edrow">
          <button className="cs-edbtn cs-del" onClick={onRemove}>Remove from map (to list)</button>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CSS — 1:1 port of the original editor's stylesheet, prefixed cs- to scope
// ─────────────────────────────────────────────────────────────────────────────
const CSS = `
.cs-root{
  --cs-bg:#f5f6fa; --cs-surface:#ffffff; --cs-text:#1a1d2e; --cs-muted:#6b7280;
  --cs-border:#e5e7eb; --cs-border-strong:#d1d5db;
  --cs-primary:#7c5cff; --cs-primary-2:#6d4ef0; --cs-primary-soft:#ede9fe;
  --cs-c-blue:#5b8def; --cs-c-cyan:#3ad0e7; --cs-c-green:#26c281;
  --cs-c-red:#f06363; --cs-c-purple:#a36cf5; --cs-c-orange:#f59e3a; --cs-c-slate:#374151;
  --cs-shadow-sm:0 1px 2px rgba(15,18,38,.06);
  --cs-shadow-md:0 4px 14px rgba(15,18,38,.08);
  --cs-shadow-lg:0 12px 32px rgba(15,18,38,.12);
  --cs-shadow-xl:0 20px 50px rgba(15,18,38,.18);
  --cs-safe-b:env(safe-area-inset-bottom,0px);
  position:relative; width:100%; height:100vh; min-height:560px; overflow:hidden;
  background:var(--cs-bg); color:var(--cs-text);
  font-family:"Inter",ui-sans-serif,-apple-system,"Segoe UI",Roboto,sans-serif;
  -webkit-font-smoothing:antialiased; overscroll-behavior:none; touch-action:none;
}
.cs-root.cs-dark{
  --cs-bg:#0f1226; --cs-surface:#1a1d3a; --cs-text:#e8e9f3; --cs-muted:#9ca3af;
  --cs-border:#2a2f4a; --cs-border-strong:#3a4060; --cs-primary-soft:#2d1f5f;
  --cs-shadow-sm:0 1px 2px rgba(0,0,0,.3);
  --cs-shadow-md:0 4px 14px rgba(0,0,0,.35);
  --cs-shadow-lg:0 12px 32px rgba(0,0,0,.45);
  --cs-shadow-xl:0 20px 50px rgba(0,0,0,.55);
}
.cs-root *, .cs-root *::before, .cs-root *::after{ box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
.cs-root button{ font:inherit; color:inherit; }

/* Top bar */
.cs-bar{
  position:absolute; top:0; left:0; right:0; z-index:40;
  display:flex; align-items:center; gap:10px;
  padding:10px 14px; padding-top:calc(10px + env(safe-area-inset-top,0px));
  background:var(--cs-surface); border-bottom:1px solid var(--cs-border); box-shadow:var(--cs-shadow-sm);
}
.cs-logo{
  width:34px; height:34px; border-radius:9px;
  background:linear-gradient(135deg,var(--cs-primary),var(--cs-c-purple));
  display:flex; align-items:center; justify-content:center;
  color:#fff; font-weight:800; font-size:15px; flex:none;
  box-shadow:0 4px 12px rgba(124,92,255,.35); letter-spacing:-.5px;
}
.cs-titleblock{ display:flex; flex-direction:column; line-height:1.15; min-width:0; }
.cs-title{ font-size:15px; font-weight:700; letter-spacing:-.2px; color:var(--cs-text); }
.cs-sub{ font-size:11px; color:var(--cs-muted); display:flex; align-items:center; gap:5px; margin-top:1px; font-weight:500; }
.cs-live{
  width:6px; height:6px; border-radius:50%; background:var(--cs-c-green);
  box-shadow:0 0 0 3px rgba(38,194,129,.2);
  animation:cs-pulse 2s ease-in-out infinite;
}
@keyframes cs-pulse{0%,100%{box-shadow:0 0 0 3px rgba(38,194,129,.2)}50%{box-shadow:0 0 0 5px rgba(38,194,129,.08)}}
.cs-spacer{ flex:1; }

/* Sync badge */
.cs-sync{
  display:flex; align-items:center; gap:6px; padding:5px 10px; border-radius:10px;
  background:var(--cs-bg); border:1px solid var(--cs-border); font-size:11px; font-weight:600;
  color:var(--cs-muted);
}
.cs-sync-dot{ width:7px; height:7px; border-radius:50%; background:var(--cs-c-green); }
.cs-sync-saving .cs-sync-dot{ background:var(--cs-c-orange); animation:cs-pulse 1.2s ease-in-out infinite; }
.cs-sync-error  .cs-sync-dot{ background:var(--cs-c-red); }
.cs-sync-saving .cs-sync-txt{ color:var(--cs-c-orange); }
.cs-sync-error  .cs-sync-txt{ color:var(--cs-c-red); }
@media(max-width:520px){ .cs-sync .cs-sync-txt{ display:none; } .cs-sync{ padding:5px 7px; } }

.cs-zoom{ display:flex; align-items:center; gap:2px; background:var(--cs-bg); border:1px solid var(--cs-border); border-radius:10px; padding:3px; }
.cs-zoom button{
  width:32px; height:32px; border:none; background:transparent; border-radius:7px;
  font-size:17px; cursor:pointer; color:var(--cs-text);
  display:flex; align-items:center; justify-content:center; font-weight:600;
}
.cs-zoom button:active{ background:var(--cs-primary-soft); color:var(--cs-primary); }
.cs-zoom .cs-z{ min-width:42px; text-align:center; font-size:11px; color:var(--cs-muted); font-weight:600; }
.cs-themeBtn{
  width:36px; height:36px; border-radius:10px; border:1px solid var(--cs-border);
  background:var(--cs-bg); cursor:pointer; font-size:14px;
  display:flex; align-items:center; justify-content:center; color:var(--cs-text);
}
.cs-themeBtn:active{ background:var(--cs-primary-soft); color:var(--cs-primary); }

/* Viewport */
.cs-viewport{ position:absolute; inset:0; overflow:hidden; background:var(--cs-bg); touch-action:none; cursor:grab; }
.cs-viewport.cs-placing{ cursor:crosshair; }
.cs-content{ position:absolute; top:0; left:0; transform-origin:0 0; will-change:transform; }
.cs-content img{ width:100%; height:100%; display:block; -webkit-user-drag:none; user-select:none; }
.cs-pins{ position:absolute; inset:0; pointer-events:none; z-index:5; }

/* Pins */
.cs-pin{ position:absolute; pointer-events:auto; touch-action:none; transform:translate(-22px,-22px); }
.cs-hit{ position:absolute; left:0; top:0; width:44px; height:44px; border-radius:50%; }
.cs-dot{
  position:absolute; left:14px; top:14px; width:16px; height:16px; border-radius:50%;
  border:3px solid #fff; box-shadow:0 2px 8px rgba(15,18,38,.4); transition:transform .12s;
}
.cs-lbl{
  position:absolute; left:38px; top:11px; font-size:12.5px; font-weight:600; line-height:1.15;
  color:#fff; padding:6px 10px; border-radius:9px; white-space:nowrap;
  box-shadow:0 4px 12px rgba(15,18,38,.25); letter-spacing:-.1px;
}
.cs-pin.cs-dragging .cs-dot{ transform:scale(1.35); box-shadow:0 0 0 5px rgba(124,92,255,.3),0 2px 8px rgba(15,18,38,.4); }
.cs-pin.cs-dragging .cs-lbl{ box-shadow:0 0 0 2px rgba(124,92,255,.55),0 4px 12px rgba(15,18,38,.3); }
.cs-pin.cs-locked .cs-dot{ box-shadow:0 0 0 4px rgba(245,158,58,.45),0 2px 8px rgba(15,18,38,.4); }

/* Bottom dock */
.cs-dock{
  position:absolute; left:50%; transform:translateX(-50%);
  bottom:calc(14px + var(--cs-safe-b)); z-index:45;
  display:flex; gap:5px; background:var(--cs-surface); border:1px solid var(--cs-border);
  border-radius:14px; padding:6px; box-shadow:var(--cs-shadow-lg);
  max-width:calc(100vw - 20px);
}
.cs-dbtn{
  border:none; background:transparent; border-radius:10px; padding:10px 14px; color:var(--cs-text);
  font-size:13px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:7px;
  white-space:nowrap; min-height:42px; position:relative;
  transition:background .15s,color .15s,transform .1s;
}
.cs-dbtn:active{ transform:scale(.96); }
.cs-dbtn:hover{ background:var(--cs-bg); }
.cs-dbtn.cs-accent{
  background:var(--cs-primary); color:#fff; font-weight:700;
  box-shadow:0 4px 12px rgba(124,92,255,.35);
}
.cs-dbtn.cs-accent:hover{ background:var(--cs-primary-2); }
.cs-dbtn .cs-ic{ font-size:14px; }
.cs-listBadge{
  background:var(--cs-c-cyan); color:#fff; border-radius:20px;
  padding:1px 7px; font-size:10px; font-weight:700; margin-left:2px;
}

/* Sheets */
.cs-sheet{
  position:absolute; left:0; right:0; bottom:0; z-index:48; background:var(--cs-surface);
  border-top:1px solid var(--cs-border); border-radius:20px 20px 0 0;
  box-shadow:var(--cs-shadow-xl);
  transform:translateY(110%); transition:transform .28s cubic-bezier(.22,1,.36,1);
  padding-bottom:calc(14px + var(--cs-safe-b)); max-height:64%;
  display:flex; flex-direction:column;
}
.cs-sheet.cs-open{ transform:translateY(0); }
.cs-sheet .cs-grab{ width:44px; height:5px; border-radius:5px; background:var(--cs-border-strong); margin:10px auto 4px; }
.cs-sheet h3{
  margin:0; padding:6px 20px 14px; font-size:17px; font-weight:700; letter-spacing:-.3px;
  display:flex; align-items:center; gap:9px; color:var(--cs-text);
}
.cs-sheet h3 .cs-c{
  margin-left:auto; font-size:11px; font-weight:700; color:var(--cs-primary);
  background:var(--cs-primary-soft); padding:3px 11px; border-radius:20px;
}
.cs-listBody{ overflow:auto; padding:0 14px 8px; display:flex; flex-direction:column; gap:6px; }
.cs-chip{
  display:flex; align-items:center; gap:11px; padding:12px 14px; border-radius:12px; cursor:pointer;
  background:var(--cs-bg); border:1px solid var(--cs-border);
  font-size:14.5px; font-weight:500; transition:all .15s;
}
.cs-chip:active{ background:var(--cs-primary-soft); border-color:var(--cs-primary); }
.cs-pdot{ width:11px; height:11px; border-radius:50%; flex:none; box-shadow:0 0 0 2px var(--cs-surface); }
.cs-nm{ flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:var(--cs-text); }
.cs-go{ font-size:10.5px; color:var(--cs-muted); font-weight:700; text-transform:uppercase; letter-spacing:.5px; }
.cs-chipDel{
  background:transparent; border:none; color:var(--cs-c-red);
  font-size:22px; width:30px; height:30px; border-radius:50%; cursor:pointer;
  display:flex; align-items:center; justify-content:center; flex:none; padding:0; line-height:1;
}
.cs-chipDel:active{ background:rgba(240,99,99,.15); }
.cs-empty{ font-size:13.5px; color:var(--cs-muted); padding:20px 6px; text-align:center; }
.cs-sec{ font-size:10.5px; letter-spacing:.9px; text-transform:uppercase; color:var(--cs-muted); font-weight:700; padding:10px 6px 4px; }

.cs-mItem{
  display:flex; align-items:center; gap:13px; padding:14px 20px; font-size:15px; font-weight:500;
  cursor:pointer; border-top:1px solid var(--cs-border); color:var(--cs-text); transition:background .15s;
}
.cs-mItem:active{ background:var(--cs-bg); }
.cs-mItem .cs-ic{ width:22px; text-align:center; font-size:16px; color:var(--cs-muted); }
.cs-mItem.cs-danger{ color:var(--cs-c-red); }
.cs-mItem.cs-danger .cs-ic{ color:var(--cs-c-red); }
.cs-ldot{ display:inline-block; width:13px; height:13px; border-radius:50%; flex:none; box-shadow:0 0 0 2px var(--cs-surface); }
.cs-pill{ font-size:11px; font-weight:700; padding:4px 11px; border-radius:20px; margin-left:auto; letter-spacing:.3px; }

/* Editor modal */
.cs-backdrop{ position:absolute; inset:0; background:rgba(15,18,38,.45); z-index:55; backdrop-filter:blur(3px); }
.cs-editor{
  position:absolute; left:50%; top:calc(72px + env(safe-area-inset-top,0px));
  transform:translateX(-50%); z-index:60;
  width:min(420px,calc(100% - 28px));
  background:var(--cs-surface); border:1px solid var(--cs-border); border-radius:18px;
  box-shadow:var(--cs-shadow-xl); padding:20px;
}
.cs-editor h4{ margin:0 0 12px; font-size:11px; letter-spacing:1px; text-transform:uppercase; color:var(--cs-muted); font-weight:700; }
.cs-edName{
  width:100%; font-size:16px; padding:14px 14px; border-radius:12px;
  border:1.5px solid var(--cs-border); background:var(--cs-bg); color:var(--cs-text); outline:none;
  font-weight:500; transition:border .15s, box-shadow .15s;
}
.cs-edName:focus{ border-color:var(--cs-primary); box-shadow:0 0 0 3px var(--cs-primary-soft); background:var(--cs-surface); }
.cs-edrow{ display:flex; gap:9px; margin-top:10px; }
.cs-edbtn{
  flex:1; border:1px solid var(--cs-border); background:var(--cs-bg); color:var(--cs-text);
  border-radius:12px; padding:12px; font-size:14px; font-weight:600; cursor:pointer; transition:all .15s;
}
.cs-edbtn:active{ transform:scale(.97); }
.cs-edbtn.cs-save{
  background:var(--cs-primary); color:#fff; border-color:var(--cs-primary);
  box-shadow:0 4px 12px rgba(124,92,255,.3);
}
.cs-edbtn.cs-save:active{ background:var(--cs-primary-2); }
.cs-edbtn.cs-del{ background:#fef2f2; color:var(--cs-c-red); border-color:rgba(240,99,99,.25); }
.cs-root.cs-dark .cs-edbtn.cs-del{ background:rgba(240,99,99,.12); }

/* Legend */
.cs-legend{
  position:absolute; left:12px; top:calc(64px + env(safe-area-inset-top,0px)); z-index:35;
  display:flex; flex-wrap:wrap; gap:5px 11px; max-width:62%;
  background:var(--cs-surface); border:1px solid var(--cs-border); padding:7px 12px; border-radius:11px;
  font-size:11.5px; font-weight:600; color:var(--cs-text); box-shadow:var(--cs-shadow-sm);
}
.cs-legend i{
  display:inline-block; width:9px; height:9px; border-radius:50%;
  margin-right:5px; vertical-align:-1px; box-shadow:0 0 0 2px var(--cs-surface);
}

/* Toast */
.cs-toast{
  position:absolute; left:50%; top:calc(64px + env(safe-area-inset-top,0px));
  transform:translateX(-50%) translateY(-10px); z-index:70;
  background:var(--cs-text); color:var(--cs-surface);
  font-weight:600; font-size:13px; padding:10px 18px; border-radius:12px;
  opacity:0; transition:.25s; pointer-events:none; box-shadow:var(--cs-shadow-lg);
}
.cs-toast.cs-show{ opacity:1; transform:translateX(-50%) translateY(0); }

/* Placing banner */
.cs-placingBanner{
  position:absolute; left:50%; top:calc(64px + env(safe-area-inset-top,0px));
  transform:translate(-50%,-130%); z-index:65;
  background:linear-gradient(135deg,var(--cs-primary),var(--cs-c-purple));
  color:#fff; font-weight:600; font-size:13px;
  padding:8px 8px 8px 16px; border-radius:12px;
  display:flex; align-items:center; gap:10px;
  transition:transform .25s cubic-bezier(.22,1,.36,1);
  box-shadow:0 12px 32px rgba(124,92,255,.45); max-width:calc(100% - 24px);
}
.cs-placingBanner.cs-show{ transform:translate(-50%,0); }
.cs-ptxt{ white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:62vw; }
.cs-pcancel{
  background:rgba(255,255,255,.22); border:none; color:#fff; font-size:18px;
  width:26px; height:26px; border-radius:50%; cursor:pointer;
  display:flex; align-items:center; justify-content:center; padding:0; line-height:1; flex:none;
}
.cs-pcancel:active{ background:rgba(255,255,255,.4); }

/* Missing image overlay */
.cs-imgmissing{
  position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
  pointer-events:none; z-index:10;
}
.cs-imgmissing-card{
  background:var(--cs-surface); border:1px dashed var(--cs-border-strong);
  border-radius:14px; padding:18px 22px; max-width:420px; text-align:center;
  box-shadow:var(--cs-shadow-lg);
}
.cs-imgmissing-title{ color:var(--cs-primary); font-weight:700; margin-bottom:6px; font-size:14px; }
.cs-imgmissing-body{ color:var(--cs-muted); font-size:12.5px; line-height:1.55; }
.cs-imgmissing-body code{ background:var(--cs-bg); padding:2px 6px; border-radius:5px; color:var(--cs-text); font-size:11.5px; }

@media(max-width:600px){
  .cs-title{ font-size:14px; }
  .cs-sub{ font-size:10px; }
  .cs-dbtn .cs-lbltext{ display:none; }
  .cs-dbtn{ padding:9px 11px; }
  .cs-legend{ font-size:10.5px; padding:6px 10px; max-width:54%; }
}
`;
