import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AddPropertyClientPage from './add-property-client';
import { getCanonicalSiteUrl } from '@/lib/siteUrl';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { sortFacilitiesByPriority } from '@/lib/facilitiesCatalog';
import type { FacilityOption } from '@/lib/listings/listingForm';
import { instagramPromotionEnabled } from '@/lib/server/instagramPromotionConfig';

const siteUrl = getCanonicalSiteUrl();

export const metadata: Metadata = {
  title: 'Adauga o proprietate',
  description: 'Formular ghidat pentru adaugarea unei proprietati pe cabn.ro, dupa autentificarea securizata prin email.',
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
    description: 'Formular ghidat pentru adaugarea unei proprietati pe cabn.ro, dupa autentificarea securizata prin email.',
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
    description: 'Formular ghidat pentru adaugarea unei proprietati pe cabn.ro, dupa autentificarea securizata prin email.',
    images: ['/images/og-default.png'],
  },
};

type AddPropertyPageProps = {
  searchParams?: Promise<{
    mode?: string;
    token?: string;
  }>;
};

export default async function AddPropertyPage({ searchParams: searchParamsPromise }: AddPropertyPageProps) {
  const searchParams = await searchParamsPromise;
  if (searchParams?.mode || searchParams?.token) redirect('/add-property');
  let facilities: FacilityOption[] = [];
  try {
    const { data, error } = await getSupabaseAdmin().from('facilities').select('id, name');
    if (error) throw error;
    facilities = (data || []).map((item) => ({ id: String(item.id), name: String(item.name) }));
  } catch {
    console.error('Nu am putut încărca facilitățile formularului.');
  }
  return <AddPropertyClientPage initialFacilities={sortFacilitiesByPriority(facilities)} promotionEnabled={instagramPromotionEnabled()} />;
}
