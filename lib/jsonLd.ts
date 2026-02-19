// NOTE: The code is based on the recommendations provided.
// It might need adjustments to fit the actual data structures of the application.

export function buildListingPageJsonLd({
  siteUrl,
  pageUrl,
  typeLabel,
  typeSlug,
  locationLabel,
  locationSlug,
  description,
  items,
}: {
  siteUrl: string;
  pageUrl: string;
  typeLabel: string;
  typeSlug: string;
  locationLabel?: string;
  locationSlug?: string;
  description: string;
  items: Array<{
    name: string;
    url: string;
    image?: string;
    addressLocality?: string;
    addressRegion?: string;
    priceRange?: string;
    aggregateRating?: { ratingValue: number; reviewCount: number };
  }>;
}) {
  const breadcrumbItems = [
    { '@type': 'ListItem', position: 1, name: 'Acasă', item: siteUrl },
    { '@type': 'ListItem', position: 2, name: 'Cazări', item: `${siteUrl}/cazari` },
    { '@type': 'ListItem', position: 3, name: typeLabel, item: `${siteUrl}/cazari/${typeSlug}` },
  ];

  if (locationLabel && pageUrl) {
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: 4,
      name: locationLabel,
      item: pageUrl,
    });
  }

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems,
  };

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${typeLabel} în ${locationLabel || 'România'}`,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    numberOfItems: items.length,
    itemListElement: items.map((it, idx) => {
      const lodgingItem: any = {
        '@type': 'LodgingBusiness',
        name: it.name,
        url: it.url,
        ...(it.image && { image: it.image }),
        ...(it.addressLocality && { address: { '@type': 'PostalAddress', addressLocality: it.addressLocality, addressRegion: it.addressRegion, addressCountry: 'RO' } }),
        ...(it.priceRange && { priceRange: it.priceRange }),
        ...(it.aggregateRating && { aggregateRating: it.aggregateRating }),
      };

      return {
        '@type': 'ListItem',
        position: idx + 1,
        item: lodgingItem,
      };
    }),
  };

  const webPage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Cazare ${typeLabel.toLowerCase()} în ${locationLabel || 'România'} | cabn.ro`,
    url: pageUrl,
    description: description,
    isPartOf: {
      '@type': 'WebSite',
      name: 'cabn',
      url: siteUrl,
    },
  };

  return [webPage, breadcrumb, itemList];
}

export function buildPropertyJsonLd({
  url,
  name,
  description,
  images,
  address,
  geo,
  priceRange,
  amenities,
  rating,
}: {
  url: string;
  name: string;
  description: string;
  images: string[];
  address: { locality?: string; region?: string; street?: string; postalCode?: string };
  geo?: { lat: number; lng: number };
  priceRange?: string;
  amenities?: string[];
  rating?: { ratingValue: number; reviewCount: number };
}) {
  const obj: any = {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    name: name,
    url: url,
    description: description,
    image: images?.length ? images : undefined,
    address: {
      '@type': 'PostalAddress',
      ...(address.street ? { streetAddress: address.street } : {}),
      ...(address.locality ? { addressLocality: address.locality } : {}),
      ...(address.region ? { addressRegion: address.region } : {}),
      ...(address.postalCode ? { postalCode: address.postalCode } : {}),
      addressCountry: 'RO',
    },
    ...(priceRange ? { priceRange } : {}),
  };

  if (geo) {
    obj.geo = { '@type': 'GeoCoordinates', latitude: geo.lat, longitude: geo.lng };
  }

  if (amenities?.length) {
    obj.amenityFeature = amenities.map((a) => ({
      '@type': 'LocationFeatureSpecification',
      name: a,
      value: true,
    }));
  }

  if (rating) {
    obj.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: rating.ratingValue,
      reviewCount: rating.reviewCount,
    };
  }

  return obj;
}

export function buildPropertyBreadcrumbJsonLd({
  siteUrl,
  pageUrl,
  listingName,
}: {
  siteUrl: string;
  pageUrl: string;
  listingName: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Acasa', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Cazari', item: `${siteUrl}/cazari` },
      { '@type': 'ListItem', position: 3, name: listingName, item: pageUrl },
    ],
  };
}

export function buildBreadcrumbJsonLd(items: Array<{ name: string; item: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: entry.name,
      item: entry.item,
    })),
  };
}


export function buildFaqJsonLd(pageUrl: string, faqs: Array<{ q: string; a: string }>) {
  if (!faqs || faqs.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', 'text': f.a },
    })),
    url: pageUrl,
  };
}

export function buildOrganizationJsonLd({
  siteUrl,
  logoPath = "/icon-512.png",
}: {
  siteUrl: string;
  logoPath?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl}#organization`,
    name: "CABN S.R.L.",
    legalName: "CABN S.R.L.",
    url: siteUrl,
    logo: new URL(logoPath, siteUrl).toString(),
    email: "marketing@cabn.ro",
    telephone: "+40-745-298-008",
    taxID: "RO52174972",
    sameAs: [
      "https://www.facebook.com/cabn.ro",
      "https://www.instagram.com/cabn.ro/",
      "https://www.tiktok.com/@cabn.ro",
    ],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "marketing@cabn.ro",
        telephone: "+40-745-298-008",
        areaServed: "RO",
        availableLanguage: ["ro", "en"],
      },
    ],
  };
}

export function buildWebSiteJsonLd({
  siteUrl,
  description,
}: {
  siteUrl: string;
  description: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}#website`,
    url: siteUrl,
    name: "cabn.ro",
    description,
    inLanguage: "ro-RO",
    publisher: {
      "@id": `${siteUrl}#organization`,
    },
  };
}

export function buildCollectionPageJsonLd({
  siteUrl,
  pageUrl,
  name,
  description,
}: {
  siteUrl: string;
  pageUrl: string;
  name: string;
  description: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${pageUrl}#webpage`,
    url: pageUrl,
    name,
    description,
    inLanguage: "ro-RO",
    isPartOf: {
      "@id": `${siteUrl}#website`,
    },
    about: {
      "@id": `${siteUrl}#organization`,
    },
  };
}
