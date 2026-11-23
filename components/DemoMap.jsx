'use client';

import { useEffect, useRef } from 'react';
import { ZONES, COL, TINT, LBL, PILOT, PILOT_LNGLAT, ll, rectAround, zonesGeoJSON, containsPoint } from '@/lib/demoData';

const eur = (n) => n.toLocaleString('de-DE') + ' €';
const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';
const H = 3.1; // lartësia e një kati, në metra
const START = { center: ll(1000, 300), zoom: 12.6, pitch: 0, bearing: 0 };
const fc = (features) => ({ type: 'FeatureCollection', features });

export default function DemoMap() {
  const rootRef = useRef(null);

  useEffect(() => {
    let map, cancelled = false, anim = 0, enterTimer = 0;
    const root = rootRef.current;
    const $ = (s) => root.querySelector(s);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const shown = new Set(['sale', 'rent', 'new', 'none']);
    let selFloor = -1, selected = false, k = 1, entered = false, touched = false;
    const pilot = { ...PILOT, fl: 7, placed: false, found: false };

    const pilotColor = () => ['case',
      ['all', ['==', selected, true], ['==', ['get', 'fl'], selFloor]], '#ffb000',
      ['!', ['in', 'sale', ['literal', [...shown]]]], '#dedbd4',
      ['==', ['get', 'st'], 'empty'], TINT.sale,
      COL.sale];
    const grayColor = () => (shown.has('none') ? '#e4e1db' : '#efede9');

    const toast = (t) => {
      const el = $('.dv-toast'); el.textContent = t; el.classList.add('show');
      clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2600);
    };

    (async () => {
      let maplibregl;
      try {
        maplibregl = (await import('maplibre-gl')).default;
        if (cancelled) return;
        map = new maplibregl.Map({ container: $('.dv-map'), style: STYLE_URL, ...START, maxPitch: 70, attributionControl: { compact: true } });
      } catch (e) { $('.dv-fail').style.display = 'grid'; return; }

      const EXT = ['bld-3d', 'pilot-floors'];
      let vec = null; // burimi vektorial i hartës bazë (OpenMapTiles)
      const setK = (v) => {
        k = v;
        EXT.forEach((l) => {
          if (!map.getLayer(l)) return;
          const top = l === 'bld-3d' ? ['coalesce', ['get', 'render_height'], 6] : ['get', 'top'];
          const base = l === 'bld-3d' ? ['coalesce', ['get', 'render_min_height'], 0] : ['get', 'base'];
          map.setPaintProperty(l, 'fill-extrusion-height', ['*', top, k]);
          map.setPaintProperty(l, 'fill-extrusion-base', ['*', base, k]);
        });
      };
      const grow = () => {
        if (reduce) { setK(1); return; }
        cancelAnimationFrame(anim);
        const t0 = performance.now();
        const step = (t) => { const p = Math.min(1, (t - t0) / 1400); setK(1 - Math.pow(1 - p, 3)); if (p < 1) anim = requestAnimationFrame(step); };
        anim = requestAnimationFrame(step);
      };
      const paint = () => {
        if (!map.getLayer('pilot-floors')) return;
        map.setPaintProperty('pilot-floors', 'fill-extrusion-color', pilotColor());
        map.setPaintProperty('bld-3d', 'fill-extrusion-color', grayColor());
        map.setLayoutProperty('pilot-sel', 'visibility', selected ? 'visible' : 'none');
      };

      // Gjen ndërtesën e OpenStreetMap që përmban pikën e objektit pilot.
      const findPilot = () => {
        if (!vec) return undefined;
        const fs = map.querySourceFeatures(vec, { sourceLayer: 'building' });
        return fs.find((f) => f.geometry && containsPoint(f.geometry, PILOT_LNGLAT));
      };
      const placePilot = (hit) => {
        const geometry = hit ? hit.geometry : rectAround(30, 22);
        const h = (hit && hit.properties && hit.properties.render_height) || 21;
        pilot.fl = Math.max(6, Math.round(h / H));
        pilot.found = !!hit; pilot.placed = true;
        const listed = new Set(pilot.units.map((u) => u.fl));
        const floors = Array.from({ length: pilot.fl }, (_, f) => ({ type: 'Feature', geometry, properties: { fl: f, base: f * H, top: f * H + H - 0.35, st: listed.has(f) ? 'sale' : 'empty' } }));
        map.getSource('pilot').setData(fc(floors));
        map.getSource('pilot-foot').setData(fc([{ type: 'Feature', geometry, properties: {} }]));
        if (hit && hit.id != null) map.setFilter('bld-3d', ['all', ['!=', ['get', 'hide_3d'], true], ['!=', ['id'], hit.id]]);
      };

      const wide = () => window.innerWidth > 600;
      const closePanel = () => { $('.dv-panel').classList.remove('open'); selected = false; selFloor = -1; paint(); };
      const enter = () => {
        if (entered) return; entered = true;
        root.classList.add('entered'); $('.dv-crumb').textContent = 'Prishtina › Lakrishte';
        setK(0);
        map.flyTo({ center: PILOT_LNGLAT, zoom: 16.4, pitch: 58, bearing: -22, duration: reduce ? 0 : 3800, essential: true });
        map.once('moveend', () => map.once('idle', () => { if (!pilot.placed) placePilot(findPilot()); grow(); }));
      };
      const leave = () => {
        entered = false; closePanel(); root.classList.remove('entered'); $('.dv-crumb').textContent = 'Prishtina';
        map.flyTo({ ...START, duration: reduce ? 0 : 2600 });
      };

      const showUnit = (u, btn) => {
        selected = true; selFloor = u.fl; paint();
        $('.dv-panel').querySelectorAll('.unit').forEach((x) => x.setAttribute('aria-current', x === btn));
        $('.dv-det').innerHTML = `<p class="big">${eur(u.p)}</p>
          <dl><dt>Kati</dt><dd>${u.fl} nga ${pilot.fl}</dd><dt>Struktura</dt><dd>${u.r}</dd><dt>Sipërfaqja</dt><dd>${u.m} m²</dd><dt>Orientimi</dt><dd>${u.o}</dd><dt>Për m²</dt><dd>${eur(Math.round(u.p / u.m))}</dd><dt>Statusi</dt><dd>Në shitje (çmim shembull)</dd></dl>
          <div class="acts"><button class="primary" type="button" data-a="tour">Hyr brenda</button><button type="button" data-a="contact">Kontakto shitësin</button></div><p class="msg"></p>`;
        $('.dv-det [data-a=tour]').onclick = () => { $('.dv-det .msg').textContent = 'Këtu hapet turi Matterport ose 3DVista i banesës. Ende nuk është shtuar.'; };
        $('.dv-det [data-a=contact]').onclick = () => { $('.dv-det .msg').textContent = 'Në këtë version nuk dërgohet asnjë mesazh. Më vonë kërkesa shkon direkt te shitësi.'; };
      };
      const openPanel = () => {
        if (!pilot.placed) placePilot(findPilot());
        selected = true; selFloor = -1; paint();
        const us = [...pilot.units].sort((a, c) => c.fl - a.fl);
        const p = $('.dv-panel');
        p.innerHTML = `<button class="close" type="button" aria-label="Mbyll">✕</button>
          <p class="kick">Lakrishte · ${pilot.fl} kate${pilot.found ? '' : ' (forma e përafërt)'}</p><h2>${pilot.name}</h2>
          <span class="stat" style="background:${COL.sale}">${LBL.sale} · ${us.length} banesa</span>
          <p class="kick">Zgjidh banesën: kati i saj ndriçohet në objekt.</p>
          <div class="units">${us.map((u, i) => `<button class="unit" type="button" data-i="${i}"><span>Kati ${u.fl}</span><span>${u.r} · ${u.m} m²</span><span class="p">${eur(u.p)}</span></button>`).join('')}</div>
          <div class="det dv-det"><p class="kick">Asnjë banesë e zgjedhur.</p></div>`;
        p.classList.add('open');
        p.querySelector('.close').onclick = closePanel;
        p.querySelectorAll('.unit').forEach((btn) => { btn.onclick = () => showUnit(us[+btn.dataset.i], btn); });
        map.easeTo({ center: PILOT_LNGLAT, zoom: Math.max(map.getZoom(), 17), pitch: 60, duration: reduce ? 0 : 900,
          padding: wide() ? { right: 390, top: 0, bottom: 0, left: 0 } : { bottom: window.innerHeight * 0.45, top: 0, left: 0, right: 0 } });
      };

      map.on('load', () => {
        const style = map.getStyle();
        const firstSymbol = (style.layers.find((l) => l.type === 'symbol') || {}).id;
        vec = (Object.entries(style.sources).find(([, src]) => src.type === 'vector') || [])[0] || null;
        map.addSource('zones', { type: 'geojson', data: zonesGeoJSON() });
        map.addSource('pilot', { type: 'geojson', data: fc([]) });
        map.addSource('pilot-foot', { type: 'geojson', data: fc([]) });
        map.addLayer({ id: 'zones-fill', type: 'fill', source: 'zones', paint: { 'fill-color': ['case', ['get', 'on'], '#0b4f8a', '#9d998f'], 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 12, 0.22, 14.2, 0.1, 15.2, 0] } }, firstSymbol);
        map.addLayer({ id: 'zones-line', type: 'line', source: 'zones', paint: { 'line-color': ['case', ['get', 'on'], '#0b4f8a', '#8a867c'], 'line-width': ['case', ['get', 'on'], 2.5, 1.2], 'line-dasharray': [3, 2], 'line-opacity': ['interpolate', ['linear'], ['zoom'], 12, 0.9, 15.2, 0] } }, firstSymbol);
        const ext = { 'fill-extrusion-opacity': 0.96, 'fill-extrusion-vertical-gradient': true };
        map.addLayer({ id: 'bld-3d', type: 'fill-extrusion', source: vec, 'source-layer': 'building', minzoom: 14, filter: ['!=', ['get', 'hide_3d'], true],
          paint: { ...ext, 'fill-extrusion-color': grayColor(), 'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 6], 'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0] } });
        map.addLayer({ id: 'pilot-sel', type: 'line', source: 'pilot-foot', layout: { visibility: 'none' }, paint: { 'line-color': '#ffb000', 'line-width': 3 } }, 'bld-3d');
        map.addLayer({ id: 'pilot-floors', type: 'fill-extrusion', source: 'pilot',
          paint: { ...ext, 'fill-extrusion-color': pilotColor(), 'fill-extrusion-height': ['get', 'top'], 'fill-extrusion-base': ['get', 'base'] } });
        try { map.setLight({ anchor: 'viewport', color: '#ffffff', intensity: 0.38, position: [1.3, 200, 35] }); } catch (e) { /* drita është opsionale */ }

        ZONES.forEach((z) => {
          const el = document.createElement('div'); el.className = 'zl' + (z.on ? ' on' : '');
          el.innerHTML = `<b>${z.n}</b><span>${z.on ? '1 objekt · 4 banesa' : 'së shpejti'}</span>`;
          el.onclick = (ev) => { ev.stopPropagation(); z.on ? enter() : toast(`${z.n}: zona hapet së shpejti.`); };
          new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(ll(z.x, z.y)).addTo(map);
        });
        const pin = document.createElement('div'); pin.className = 'pin'; pin.textContent = 'Objekti pilot · 4 banesa';
        pin.onclick = (ev) => { ev.stopPropagation(); openPanel(); };
        new maplibregl.Marker({ element: pin, anchor: 'bottom', offset: [0, -40] }).setLngLat(PILOT_LNGLAT).addTo(map);
        enterTimer = setTimeout(() => { if (!entered && !touched) enter(); }, 2600);
      });

      // Nëse përdoruesi afrohet vetë, objekti pilot vendoset sapo të ngarkohen ndërtesat.
      map.on('idle', () => {
        if (pilot.placed || map.getZoom() < 14.5) return;
        const hit = findPilot();
        if (hit) placePilot(hit);
      });

      map.on('mousedown', () => { touched = true; });
      map.on('touchstart', () => { touched = true; });
      map.on('zoom', () => root.classList.toggle('near', map.getZoom() > 14.3));
      const pickAt = (pt) => map.queryRenderedFeatures(pt, { layers: ['pilot-floors', 'bld-3d', 'zones-fill'] });
      map.on('click', (e) => {
        const fs = pickAt(e.point); if (!fs.length) { closePanel(); return; }
        const f = fs[0], lid = f.layer.id;
        if (lid === 'pilot-floors') openPanel();
        else if (lid === 'bld-3d') { closePanel(); toast('Ky objekt nuk ka ende banesa në listim.'); }
        else if (f.properties.n === 'Lakrishte') { if (entered) closePanel(); else enter(); }
        else toast(`${f.properties.n}: zona hapet së shpejti.`);
      });
      map.on('mousemove', (e) => {
        const fs = pickAt(e.point), tip = $('.dv-tip');
        map.getCanvas().style.cursor = fs.length ? 'pointer' : '';
        if (!fs[0] || fs[0].layer.id !== 'pilot-floors') { tip.style.display = 'none'; return; }
        tip.textContent = `${pilot.name} · ${pilot.units.length} banesa në shitje`;
        tip.style.display = 'block'; tip.style.left = e.point.x + 14 + 'px'; tip.style.top = e.point.y + 14 + 'px';
      });
      map.on('mouseout', () => { $('.dv-tip').style.display = 'none'; });
      map.on('error', (e) => { console.warn(e && e.error); });

      const LEG = [['sale', 'Shitje', COL.sale], ['rent', 'Qira', COL.rent], ['new', 'Të reja', COL.new], ['none', 'Pa listim', '#cfcac0']];
      const leg = $('.dv-legend');
      leg.innerHTML = LEG.map(([s, l, c]) => `<button class="chip box" type="button" aria-pressed="true" data-s="${s}"><i style="background:${c}"></i>${l}</button>`).join('');
      leg.querySelectorAll('.chip').forEach((btn) => {
        btn.onclick = () => {
          const s = btn.dataset.s; shown.has(s) ? shown.delete(s) : shown.add(s);
          btn.setAttribute('aria-pressed', shown.has(s)); paint();
        };
      });
      $('.dv-enter').onclick = enter;
      $('.dv-back').onclick = leave;
      $('.dv-zin').onclick = () => map.zoomIn();
      $('.dv-zout').onclick = () => map.zoomOut();
      $('.dv-north').onclick = () => map.easeTo({ bearing: entered ? -22 : 0, pitch: entered ? 58 : 0, duration: reduce ? 0 : 700 });
    })();

    return () => {
      cancelled = true; cancelAnimationFrame(anim); clearTimeout(enterTimer);
      if (map) map.remove();
    };
  }, []);

  return (
    <div className="dv" ref={rootRef}>
      <div className="dv-map" aria-label="Harta 3D e Prishtinës" />
      <header className="top">
        <div className="brand box"><b>DOMVERSA</b><span className="crumb dv-crumb">Prishtina</span></div>
        <button className="box back dv-back" type="button">← Qyteti</button>
      </header>
      <section className="intro box">
        <h1>Prishtina, e ndarë në zona</h1>
        <p>Zgjidh një zonë. Në pilot është hapur Lakrishtja: afrohu dhe ndërtesat ngrihen në 3D. Objektet me banesa në listim kanë ngjyrë.</p>
        <button className="primary dv-enter" type="button">Hyr në Lakrishte</button>
      </section>
      <div className="ctl">
        <button className="box dv-zin" type="button" aria-label="Zmadho">+</button>
        <button className="box dv-zout" type="button" aria-label="Zvogëlo">−</button>
        <button className="box dv-north" type="button" aria-label="Kthe drejtimin">⌂</button>
      </div>
      <div className="legend dv-legend" />
      <p className="note">Harta dhe ndërtesat: OpenStreetMap. Kufijtë e zonave janë të përafërt; çmimet e banesave janë shembull.</p>
      <aside className="box dv-panel" aria-live="polite" />
      <div className="box dv-tip" />
      <div className="box dv-toast" role="status" />
      <div className="dv-fail"><p>Harta 3D nuk u hap në këtë shfletues (duhet WebGL). Provo në Chrome, Safari ose Firefox të përditësuar.</p></div>
    </div>
  );
}
