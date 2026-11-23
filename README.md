# DOMVERSA

Platforma që e tregon pronën në qytetin real: harta 3D e Prishtinës, objektet dhe banesat në shitje ose me qira.

## Gjendja
- Faza 1: demo e hartës (zona, afrimi në Lakrishte, objektet si box-e me ngjyrë sipas statusit, objekti pilot me 4 banesa).
- Të dhënat janë ende shembull skematik (`lib/demoData.js`).

## Teknologjia
- Next.js (App Router) + React
- MapLibre GL JS për hartën 3D
- Publikimi: Vercel (automatikisht nga GitHub)
- Më vonë: Supabase (databaza), OpenStreetMap (ndërtesat reale)

## Struktura
- `app/` – faqet dhe stili
- `components/DemoMap.jsx` – harta dhe paneli i objektit
- `lib/demoData.js` – të dhënat demo
