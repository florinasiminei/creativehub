import type { Metadata } from 'next';
import AddPropertyClientPage from './add-property-client';
import { getCanonicalSiteUrl } from '@/lib/siteUrl';

const siteUrl = getCanonicalSiteUrl();

export const metadata: Metadata = {
  title: 'Adauga o proprietate',
  description: 'Formular privat pentru adaugarea unei proprietati pe cabn.ro.',
  alternates: {
    canonical: '/add-property',
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      'max-snippet': 0,
      'max-image-preview': 'none',
      'max-video-preview': 0,
    },
  },
  openGraph: {
    type: 'website',
    url: `${siteUrl}/add-property`,
    title: 'Adauga o proprietate | cabn.ro',
    description: 'Formular privat pentru adaugarea unei proprietati pe cabn.ro.',
    siteName: 'cabn',
    images: [
      {
        url: '/images/og-default.png',
        width: 1200,
        height: 630,
        alt: 'CABN',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Adauga o proprietate | cabn.ro',
    description: 'Formular privat pentru adaugarea unei proprietati pe cabn.ro.',
    images: ['/images/og-default.png'],
  },
};

export default function AddPropertyPage() {
  return <AddPropertyClientPage />;
}
