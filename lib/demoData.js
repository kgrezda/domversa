// Të dhëna demo: zonat e Prishtinës dhe një Lakrishte skematike.
// Do të zëvendësohen me ndërtesat reale nga OpenStreetMap dhe me të dhënat nga Supabase.

export const COL = { sale: '#1f6fd1', rent: '#c1121f', new: '#7b4fd6' };
export const TINT = { sale: '#c8daf2', rent: '#f0c8cb', new: '#ddd1f4' };
export const LBL = { sale: 'Në shitje', rent: 'Me qira', new: 'Objekt i ri (STUDIO)' };

const lat0 = 42.6505, lng0 = 21.15, R = 111320;
const cosL = Math.cos((lat0 * Math.PI) / 180), rot = (-16 * Math.PI) / 180;

// metra lokalë -> [gjatësi, gjerësi]
export const ll = (x, y) => {
  const a = x * Math.cos(rot) - y * Math.sin(rot), b = x * Math.sin(rot) + y * Math.cos(rot);
  return [lng0 + a / (R * cosL), lat0 + b / R];
};
const ring = (pts) => ({ type: 'Polygon', coordinates: [[...pts, pts[0]].map((p) => ll(p[0], p[1]))] });
const rect = (cx, cy, w, h) => ring([[cx - w / 2, cy - h / 2], [cx + w / 2, cy - h / 2], [cx + w / 2, cy + h / 2], [cx - w / 2, cy + h / 2]]);
const fc = (features) => ({ type: 'FeatureCollection', features });
const feat = (geometry, properties) => ({ type: 'Feature', geometry, properties });

export const ZONES = [
  { n: 'Lakrishte', x: 0, y: 0, w: 1050, h: 840, on: true },
  { n: 'Qendra', x: 1150, y: 900, w: 900, h: 760 },
  { n: 'Dardania', x: 1300, y: -100, w: 1000, h: 760 },
  { n: 'Ulpiana', x: 200, y: -1080, w: 900, h: 780 },
  { n: 'Arbëria', x: -1180, y: 720, w: 900, h: 780 },
  { n: 'Kalabria', x: -1220, y: -500, w: 900, h: 780 },
  { n: 'Bregu i Diellit', x: 1180, y: -1130, w: 900, h: 780 },
  { n: 'Tophane', x: 80, y: 1080, w: 880, h: 700 },
];

export function buildDemo() {
  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const pick = (a) => a[Math.floor(rnd() * a.length)];

  const zoneGeom = (z) => {
    const j = () => (rnd() - 0.5) * 90, hw = z.w / 2, hh = z.h / 2;
    return ring([[z.x - hw + j(), z.y - hh + j()], [z.x + j(), z.y - hh + j()], [z.x + hw + j(), z.y - hh + j()], [z.x + hw + j(), z.y + hh + j()], [z.x + j(), z.y + hh + j()], [z.x - hw + j(), z.y + hh + j()]]);
  };

  const XS = [-450, -270, -90, 90, 270, 450], YS = [-350, -175, 0, 175, 350];
  const streets = [], blocks = [], parks = [], B = [];
  XS.forEach((x) => streets.push(feat({ type: 'LineString', coordinates: [ll(x, -430), ll(x, 430)] }, { c: x === -90 ? 1 : 0 })));
  YS.forEach((y) => streets.push(feat({ type: 'LineString', coordinates: [ll(-540, y), ll(540, y)] }, { c: y === 0 ? 1 : 0 })));
  ZONES.slice(1).forEach((z) => streets.push(feat({ type: 'LineString', coordinates: [ll(0, 0), ll(z.x * 0.55, z.y * 0.55), ll(z.x, z.y)] }, { c: 2 })));

  for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) {
    const cx = (XS[i] + XS[i + 1]) / 2, cy = (YS[j] + YS[j + 1]) / 2, bw = XS[i + 1] - XS[i] - 22, bh = YS[j + 1] - YS[j] - 22;
    blocks.push(feat(rect(cx, cy, bw, bh), {}));
    if (i === 2 && j === 1) { parks.push(feat(rect(cx, cy, bw - 16, bh - 16), {})); continue; }
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy], k) => {
      if (k > 0 && rnd() < 0.16) return;
      const w = 34 + rnd() * 30, h = 26 + rnd() * 28;
      B.push({ id: 'b' + B.length, name: `Objekti ${'ABCDE'[i]}${j + 1}-${k + 1}`, x: cx + (sx * bw) / 4 + (rnd() - 0.5) * 8, y: cy + (sy * bh) / 4 + (rnd() - 0.5) * 8, w, h, fl: 3 + Math.floor(rnd() * 10), st: 'none', units: [], blk: i + '-' + j });
    });
  }

  const pilot = B.find((b) => b.blk === '1-2') || B[0];
  Object.assign(pilot, {
    name: 'Objekti pilot', fl: 7, st: 'sale', w: 52, h: 40, units: [
      { fl: 2, r: '2+1', m: 78, o: 'Jug', p: 98000 }, { fl: 3, r: '3+1', m: 96, o: 'Jug-Lindje', p: 121000 },
      { fl: 4, r: '2+1', m: 82, o: 'Perëndim', p: 109500 }, { fl: 5, r: '3+1', m: 104, o: 'Jug', p: 142000 }],
  });

  const rest = B.filter((b) => b !== pilot).sort(() => rnd() - 0.5);
  ['sale', 'sale', 'sale', 'sale', 'sale', 'rent', 'rent', 'rent', 'new', 'new'].forEach((st, k) => {
    const b = rest[k]; b.st = st;
    const fls = [...new Set(Array.from({ length: 1 + Math.floor(rnd() * 3) }, () => 1 + Math.floor(rnd() * (b.fl - 1))))].sort((a, c) => a - c);
    fls.forEach((f) => {
      const n = 1 + Math.floor(rnd() * 2);
      for (let u = 0; u < n; u++) {
        const r = pick(['1+1', '2+1', '2+1', '3+1']);
        const m = r === '1+1' ? 46 + Math.round(rnd() * 14) : r === '2+1' ? 68 + Math.round(rnd() * 18) : 90 + Math.round(rnd() * 30);
        const p = st === 'rent' ? Math.round((m * (5 + rnd() * 3)) / 10) * 10 : Math.round((m * (1150 + rnd() * 350)) / 500) * 500;
        b.units.push({ fl: f, r, m, o: pick(['Jug', 'Lindje', 'Perëndim', 'Veri', 'Jug-Lindje']), p });
      }
    });
  });

  const active = B.filter((b) => b.st !== 'none');
  const H = 3.1, gray = [], floors = [], foot = [];
  B.forEach((b) => {
    const g = rect(b.x, b.y, b.w, b.h);
    foot.push(feat(g, { bid: b.id }));
    if (b.st === 'none') { gray.push(feat(g, { bid: b.id, base: 0, top: b.fl * H })); return; }
    const listed = new Set(b.units.map((u) => u.fl));
    for (let f = 0; f < b.fl; f++) floors.push(feat(g, { bid: b.id, fl: f, base: f * H, top: f * H + H - 0.35, st: listed.has(f) ? b.st : 'empty', bst: b.st }));
  });

  return {
    B, pilot, active,
    unitsIn: active.reduce((s, b) => s + b.units.length, 0),
    sources: {
      zones: fc(ZONES.map((z) => feat(zoneGeom(z), { n: z.n, on: !!z.on }))),
      streets: fc(streets), blocks: fc(blocks), parks: fc(parks),
      gray: fc(gray), floors: fc(floors), foot: fc(foot),
    },
  };
}
