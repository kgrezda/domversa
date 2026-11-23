import 'maplibre-gl/dist/maplibre-gl.css';
import './globals.css';
import { Literata } from 'next/font/google';

const literata = Literata({ subsets: ['latin', 'latin-ext'], weight: ['400', '600'], display: 'swap' });

export const metadata = {
  title: 'DOMVERSA – Prishtina në 3D',
  description: 'Gjej pronën në qytetin real: harta 3D, objektet dhe banesat në shitje ose me qira.',
};

export const viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="sq">
      <body className={literata.className}>{children}</body>
    </html>
  );
}
