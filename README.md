# DOMVERSA

Platforma që e tregon pronën në qytetin real: harta 3D e Prishtinës, objektet dhe banesat në shitje ose me qira.

## Gjendja
- Faza 1: harta reale e Prishtinës, zonat (kufij të përafërt), afrimi në Lakrishte, ndërtesat reale si box-e, objekti pilot me 4 banesa.
- Harta bazë dhe ndërtesat: OpenStreetMap përmes OpenFreeMap (pa çelës). Objekti pilot në 42.655715, 21.151035; çmimet e banesave janë shembull (`lib/demoData.js`).

## Teknologjia
- Next.js (App Router) + React
- MapLibre GL JS për hartën 3D
- Publikimi: Vercel (automatikisht nga GitHub)
- Më vonë: Supabase (databaza), OpenStreetMap (ndërtesat reale)

## Struktura
- `app/` – faqet dhe stili
- `components/DemoMap.jsx` – harta dhe paneli i objektit
- `lib/demoData.js` – të dhënat demo
