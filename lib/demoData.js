import { LAKRISHTE_RING } from './lakrishte';

// Të dhënat e para: zonat e Prishtinës (kufij të përafërt) dhe objekti pilot.
// Ndërtesat vijnë nga OpenStreetMap përmes hartës bazë; më vonë të dhënat do të ruhen në Supabase.

export const COL = { sale: '#1f6fd1', rent: '#c1121f', new: '#7b4fd6' };
export const TINT = { sale: '#c8daf2', rent: '#f0c8cb', new: '#ddd1f4' };
export const LBL = { sale: 'Në shitje', rent: 'Me qira', new: 'Objekt i ri (STUDIO)' };

// Objekti pilot: koordinatat e dhëna nga pronari (23 nëntor 2026)
export const PILOT_LNGLAT = [21.151035, 42.655715];

// Çmimet dhe banesat janë ende shembull, derisa të vijnë të dhënat reale.
export const PILOT = {
  name: 'Objekti pilot',
  st: 'sale',
  units: [
    { fl: 2, r: '2+1', m: 78, o: 'Jug', p: 98000 },
    { fl: 3, r: '3+1', m: 96, o: 'Jug-Lindje', p: 121000 },
    { fl: 4, r: '2+1', m: 82, o: 'Perëndim', p: 109500 },
    { fl: 5, r: '3+1', m: 104, o: 'Jug', p: 142000 },
  ],
};

const [lng0, lat0] = PILOT_LNGLAT, R = 111320, cosL = Math.cos((lat0 * Math.PI) / 180);

// metra nga objekti pilot (x lindje, y veri) -> [gjatësi, gjerësi]
export const ll = (x, y) => [lng0 + x / (R * cosL), lat0 + y / R];

const ring = (pts) => ({ type: 'Polygon', coordinates: [[...pts, pts[0]].map((p) => ll(p[0], p[1]))] });
export const rectAround = (w, h) => ring([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]);

// Lakrishtja ka kufirin real (i vizatuar nga pronari). Zonat e tjera janë ende skematike.
export const ZONES = [
  { n: 'Lakrishte', x: 218, y: 326, on: true, real: true },
  { n: 'Qendra', x: 1300, y: 900, w: 900, h: 780 },
  { n: 'Dardania', x: 1500, y: -300, w: 900, h: 780 },
  { n: 'Ulpiana', x: 2450, y: 300, w: 900, h: 780 },
  { n: 'Arbëria', x: 150, y: 1600, w: 900, h: 780 },
  { n: 'Kalabria', x: -200, y: -1200, w: 900, h: 780 },
  { n: 'Bregu i Diellit', x: 2500, y: -1000, w: 900, h: 780 },
  { n: 'Tophane', x: 1400, y: 1900, w: 900, h: 700 },
];

export function zonesGeoJSON() {
  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const features = ZONES.map((z) => {
    if (z.real) return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [LAKRISHTE_RING] }, properties: { n: z.n, on: !!z.on } };
    const j = () => (rnd() - 0.5) * 90, hw = z.w / 2, hh = z.h / 2;
    const geometry = ring([[z.x - hw + j(), z.y - hh + j()], [z.x + j(), z.y - hh + j()], [z.x + hw + j(), z.y - hh + j()], [z.x + hw + j(), z.y + hh + j()], [z.x + j(), z.y + hh + j()], [z.x - hw + j(), z.y + hh + j()]]);
    return { type: 'Feature', geometry, properties: { n: z.n, on: !!z.on } };
  });
  return { type: 'FeatureCollection', features };
}

// A është pika brenda poligonit (Polygon ose MultiPolygon)?
export function containsPoint(geometry, [px, py]) {
  const inRing = (r) => {
    let inside = false;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [xi, yi] = r[i], [xj, yj] = r[j];
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  const inPoly = (rings) => inRing(rings[0]) && !rings.slice(1).some(inRing);
  if (geometry.type === 'Polygon') return inPoly(geometry.coordinates);
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.some(inPoly);
  return false;
}
