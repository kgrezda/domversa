'use client';

import { useEffect, useRef } from 'react';
import { buildDemo, ll, ZONES, COL, TINT, LBL } from '@/lib/demoData';

const eur = (n) => n.toLocaleString('de-DE') + ' €';

export default function DemoMap() {
  const rootRef = useRef(null);

  useEffect(() => {
    let map, cancelled = false, anim = 0, enterTimer = 0;
    const root = rootRef.current;
    const $ = (s) => root.querySelector(s);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const { B, pilot, active, unitsIn, sources } = buildDemo();
    const byId = (id) => B.find((b) => b.id === id);

    const shown = new Set(['sale', 'rent', 'new', 'none']);
    let sel = { b: '', f: -1 }, k = 0, entered = false, touched = false;

    const floorColor = () => ['case',
      ['all', ['==', ['get', 'bid'], sel.b], ['==', ['get', 'fl'], sel.f]], '#ffb000',
      ['!', ['in', ['get', 'bst'], ['literal', [...shown]]]], '#dedbd4',
      ['==', ['get', 'st'], 'empty'], ['match', ['get', 'bst'], 'sale', TINT.sale, 'rent', TINT.rent, TINT.new],
      ['match', ['get', 'st'], 'sale', COL.sale, 'rent', COL.rent, COL.new]];
    const grayColor = () => ['case', ['==', ['get', 'bid'], sel.b], '#c4bfb5', shown.has('none') ? '#e4e1db' : '#efede9'];

    const toast = (t) => {
      const el = $('.dv-toast'); el.textContent = t; el.classList.add('show');
      clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2600);
    };

    (async () => {
      let maplibregl;
      try {
        maplibregl = (await import('maplibre-gl')).default;
        if (cancelled) return;
        map = new maplibregl.Map({
          container: $('.dv-map'), attributionControl: false, center: ll(60, 0), zoom: 12.25, pitch: 0, bearing: 0, maxPitch: 70,
          style: { version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#eceee9' } }] },
        });
      } catch (e) { $('.dv-fail').style.display = 'grid'; return; }

      const setK = (v) => {
        k = v;
        ['bld-gray', 'bld-floors'].forEach((l) => {
          map.setPaintProperty(l, 'fill-extrusion-height', ['*', ['get', 'top'], k]);
          map.setPaintProperty(l, 'fill-extrusion-base', ['*', ['get', 'base'], k]);
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
        if (!map.getLayer('bld-floors')) return;
        map.setPaintProperty('bld-floors', 'fill-extrusion-color', floorColor());
        map.setPaintProperty('bld-gray', 'fill-extrusion-color', grayColor());
        map.setFilter('sel', ['==', ['get', 'bid'], sel.b]);
      };
      const wide = () => window.innerWidth > 600;

      const closePanel = () => { $('.dv-panel').classList.remove('open'); sel = { b: '', f: -1 }; paint(); };
      const enter = () => {
        if (entered) return; entered = true;
        root.classList.add('entered'); $('.dv-crumb').textContent = 'Prishtina › Lakrishte';
        setK(0);
        map.flyTo({ center: ll(0, -40), zoom: 16.1, pitch: 58, bearing: -22, duration: reduce ? 0 : 3800, essential: true });
        map.once('moveend', grow);
      };
      const leave = () => {
        entered = false; closePanel(); root.classList.remove('entered'); $('.dv-crumb').textContent = 'Prishtina';
        map.flyTo({ center: ll(60, 0), zoom: 12.25, pitch: 0, bearing: 0, duration: reduce ? 0 : 2600 });
      };

      const showUnit = (b, u, btn) => {
        sel = { b: b.id, f: u.fl }; paint();
        $('.dv-panel').querySelectorAll('.unit').forEach((x) => x.setAttribute('aria-current', x === btn));
        const ppm = b.st === 'rent' ? '' : `<dt>Për m²</dt><dd>${eur(Math.round(u.p / u.m))}</dd>`;
        $('.dv-det').innerHTML = `<p class="big">${b.st === 'rent' ? eur(u.p) + ' / muaj' : eur(u.p)}</p>
          <dl><dt>Kati</dt><dd>${u.fl} nga ${b.fl}</dd><dt>Struktura</dt><dd>${u.r}</dd><dt>Sipërfaqja</dt><dd>${u.m} m²</dd><dt>Orientimi</dt><dd>${u.o}</dd>${ppm}<dt>Statusi</dt><dd>${b.st === 'new' ? 'Në ndërtim' : 'E verifikuar (shembull)'}</dd></dl>
          <div class="acts"><button class="primary" type="button" data-a="tour">Hyr brenda</button><button type="button" data-a="contact">Kontakto shitësin</button></div><p class="msg"></p>`;
        $('.dv-det [data-a=tour]').onclick = () => { $('.dv-det .msg').textContent = b.st === 'new' ? 'Këtu hapet prezantimi i STUDIO (renderime, 360°). Në demo ende nuk ka përmbajtje.' : 'Këtu hapet turi Matterport ose 3DVista i njësisë. Në demo ende nuk ka tur.'; };
        $('.dv-det [data-a=contact]').onclick = () => { $('.dv-det .msg').textContent = 'Në demo nuk dërgohet asnjë mesazh. Në platformë, kërkesa shkon direkt te shitësi.'; };
      };
      const openPanel = (b) => {
        sel = { b: b.id, f: -1 }; paint();
        const us = [...b.units].sort((a, c) => c.fl - a.fl);
        const p = $('.dv-panel');
        p.innerHTML = `<button class="close" type="button" aria-label="Mbyll">✕</button>
          <p class="kick">Lakrishte · ${b.fl} kate</p><h2>${b.name}</h2>
          <span class="stat" style="background:${COL[b.st]}">${LBL[b.st]} · ${us.length} njësi</span>
          <p class="kick">Zgjidh njësinë: kati i saj ndriçohet në objekt.</p>
          <div class="units">${us.map((u, i) => `<button class="unit" type="button" data-i="${i}"><span>Kati ${u.fl}</span><span>${u.r} · ${u.m} m²</span><span class="p">${b.st === 'rent' ? eur(u.p) + '/muaj' : eur(u.p)}</span></button>`).join('')}</div>
          <div class="det dv-det"><p class="kick">Asnjë njësi e zgjedhur.</p></div>`;
        p.classList.add('open');
        p.querySelector('.close').onclick = closePanel;
        p.querySelectorAll('.unit').forEach((btn) => { btn.onclick = () => showUnit(b, us[+btn.dataset.i], btn); });
        map.easeTo({ center: ll(b.x, b.y), zoom: Math.max(map.getZoom(), 16.8), pitch: 60, duration: reduce ? 0 : 900,
          padding: wide() ? { right: 390, top: 0, bottom: 0, left: 0 } : { bottom: window.innerHeight * 0.45, top: 0, left: 0, right: 0 } });
      };

      map.on('load', () => {
        Object.entries(sources).forEach(([id, data]) => map.addSource(id, { type: 'geojson', data }));
        map.addLayer({ id: 'zones-fill', type: 'fill', source: 'zones', paint: { 'fill-color': ['case', ['get', 'on'], '#0b4f8a', '#b9b5ac'], 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 12, 0.3, 14.2, 0.16, 15.4, 0] } });
        map.addLayer({ id: 'zones-line', type: 'line', source: 'zones', paint: { 'line-color': ['case', ['get', 'on'], '#0b4f8a', '#9d998f'], 'line-width': ['case', ['get', 'on'], 2.5, 1.2], 'line-opacity': ['interpolate', ['linear'], ['zoom'], 12, 1, 15.4, 0] } });
        map.addLayer({ id: 'blocks', type: 'fill', source: 'blocks', minzoom: 13, paint: { 'fill-color': '#e1e3dc', 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0, 14, 1] } });
        map.addLayer({ id: 'parks', type: 'fill', source: 'parks', minzoom: 13, paint: { 'fill-color': '#c9dfbf' } });
        map.addLayer({ id: 'streets-case', type: 'line', source: 'streets', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#cfd2ca', 'line-width': ['interpolate', ['exponential', 2], ['zoom'], 11, ['case', ['==', ['get', 'c'], 2], 3, 0], 14, ['match', ['get', 'c'], 2, 7, 1, 6, 4], 18, ['match', ['get', 'c'], 2, 60, 1, 52, 34]] } });
        map.addLayer({ id: 'streets', type: 'line', source: 'streets', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': ['interpolate', ['exponential', 2], ['zoom'], 11, ['case', ['==', ['get', 'c'], 2], 2, 0], 14, ['match', ['get', 'c'], 2, 5, 1, 4.5, 2.5], 18, ['match', ['get', 'c'], 2, 52, 1, 46, 28]] } });
        map.addLayer({ id: 'sel', type: 'line', source: 'foot', filter: ['==', ['get', 'bid'], ''], paint: { 'line-color': '#ffb000', 'line-width': 3 } });
        const ext = { 'fill-extrusion-height': 0, 'fill-extrusion-base': 0, 'fill-extrusion-opacity': 0.97, 'fill-extrusion-vertical-gradient': true };
        map.addLayer({ id: 'bld-gray', type: 'fill-extrusion', source: 'gray', minzoom: 13.5, paint: { ...ext, 'fill-extrusion-color': grayColor() } });
        map.addLayer({ id: 'bld-floors', type: 'fill-extrusion', source: 'floors', minzoom: 13.5, paint: { ...ext, 'fill-extrusion-color': floorColor() } });
        try { map.setLight({ anchor: 'viewport', color: '#ffffff', intensity: 0.38, position: [1.3, 200, 35] }); } catch (e) { /* drita është opsionale */ }

        ZONES.forEach((z) => {
          const el = document.createElement('div'); el.className = 'zl' + (z.on ? ' on' : '');
          el.innerHTML = `<b>${z.n}</b><span>${z.on ? unitsIn + ' njësi aktive' : 'së shpejti'}</span>`;
          el.onclick = (ev) => { ev.stopPropagation(); z.on ? enter() : toast(`${z.n}: zona hapet së shpejti.`); };
          new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(ll(z.x, z.y)).addTo(map);
        });
        const pin = document.createElement('div'); pin.className = 'pin'; pin.textContent = 'Objekti pilot · 4 banesa';
        pin.onclick = (ev) => { ev.stopPropagation(); openPanel(pilot); };
        new maplibregl.Marker({ element: pin, anchor: 'bottom', offset: [0, -30] }).setLngLat(ll(pilot.x, pilot.y)).addTo(map);
        enterTimer = setTimeout(() => { if (!entered && !touched) enter(); }, 2600);
      });

      map.on('mousedown', () => { touched = true; });
      map.on('touchstart', () => { touched = true; });
      map.on('zoom', () => root.classList.toggle('near', map.getZoom() > 14.3));
      const pickAt = (pt) => map.queryRenderedFeatures(pt, { layers: ['bld-floors', 'bld-gray', 'zones-fill'] });
      map.on('click', (e) => {
        const fs = pickAt(e.point); if (!fs.length) { closePanel(); return; }
        const f = fs[0], lid = f.layer.id;
        if (lid === 'bld-floors') openPanel(byId(f.properties.bid));
        else if (lid === 'bld-gray') { closePanel(); toast(`${byId(f.properties.bid).name} nuk ka njësi në listim.`); }
        else if (f.properties.n === 'Lakrishte') { if (entered) closePanel(); else enter(); }
        else toast(`${f.properties.n}: zona hapet së shpejti.`);
      });
      map.on('mousemove', (e) => {
        const fs = pickAt(e.point), tip = $('.dv-tip');
        map.getCanvas().style.cursor = fs.length ? 'pointer' : '';
        const f = fs[0];
        if (!f || f.layer.id !== 'bld-floors') { tip.style.display = 'none'; return; }
        const b = byId(f.properties.bid);
        tip.textContent = `${b.name} · ${b.units.length} njësi ${b.st === 'rent' ? 'me qira' : 'në shitje'}`;
        tip.style.display = 'block'; tip.style.left = e.point.x + 14 + 'px'; tip.style.top = e.point.y + 14 + 'px';
      });
      map.on('mouseout', () => { $('.dv-tip').style.display = 'none'; });

      const counts = { sale: 0, rent: 0, new: 0, none: B.length - active.length };
      active.forEach((b) => { counts[b.st] += 1; });
      const LEG = [['sale', 'Shitje', COL.sale], ['rent', 'Qira', COL.rent], ['new', 'Të reja', COL.new], ['none', 'Pa listim', '#cfcac0']];
      const leg = $('.dv-legend');
      leg.innerHTML = LEG.map(([s, l, c]) => `<button class="chip box" type="button" aria-pressed="true" data-s="${s}"><i style="background:${c}"></i>${l} · ${counts[s]}</button>`).join('');
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
      $('.dv-north').onclick = () => map.easeTo({ bearing: -22, pitch: entered ? 58 : 0, duration: reduce ? 0 : 700 });
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
        <p>Zgjidh një zonë. Në pilot është hapur Lakrishtja: afrohu dhe objektet ngrihen në 3D, me ngjyrë sipas shitjes ose qirasë.</p>
        <button className="primary dv-enter" type="button">Hyr në Lakrishte</button>
      </section>
      <div className="ctl">
        <button className="box dv-zin" type="button" aria-label="Zmadho">+</button>
        <button className="box dv-zout" type="button" aria-label="Zvogëlo">−</button>
        <button className="box dv-north" type="button" aria-label="Kthe drejtimin">⌂</button>
      </div>
      <div className="legend dv-legend" />
      <p className="note">Demo: zonat, objektet dhe çmimet janë shembull skematik. Të dhënat reale vijnë nga OpenStreetMap dhe nga ndërtuesit.</p>
      <aside className="box dv-panel" aria-live="polite" />
      <div className="box dv-tip" />
      <div className="box dv-toast" role="status" />
      <div className="dv-fail"><p>Harta 3D nuk u hap në këtë shfletues (duhet WebGL). Provo në Chrome, Safari ose Firefox të përditësuar.</p></div>
    </div>
  );
}
