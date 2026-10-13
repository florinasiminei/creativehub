export type ExplorePhoto = {
  image?: string;
  imageAlt?: string;
  imagePosition?: string;
};

// Curated independently of listing order; see docs/explore-photography.md for sources.
const destinationPhotos: Record<string, ExplorePhoto> = {
  brasov: {
    image: "https://img.cabn.ro/explore/destinations/brasov-pexels-19768814.jpg",
    imageAlt: "Piața Sfatului și Casa Sfatului din Brașov, în lumina apusului",
    imagePosition: "50% 48%",
  },
  cluj: {
    image: "https://img.cabn.ro/explore/destinations/cluj-pexels-1258332.jpg",
    imageAlt: "Biserica Sfântul Mihail și centrul istoric al Clujului",
    imagePosition: "50% 70%",
  },
  bihor: {
    image: "https://img.cabn.ro/explore/destinations/bihor-pexels-18397476.jpg",
    imageAlt: "Turnul Primăriei Oradea și malul Crișului Repede, iluminate seara",
    imagePosition: "50% 28%",
  },
  suceava: {
    image: "https://img.cabn.ro/explore/destinations/suceava-pexels-9376310.jpg",
    imageAlt: "Frescele exterioare în albastru de Voroneț, în județul Suceava",
    imagePosition: "50% 50%",
  },
  maramures: {
    image: "https://img.cabn.ro/explore/destinations/maramures-unsplash-vnCpDFhR2UY.jpg",
    imageAlt: "Crucile pictate de la Cimitirul Vesel din Săpânța, Maramureș",
    imagePosition: "50% 90%",
  },
  "bistrita-nasaud": {
    image: "https://img.cabn.ro/explore/destinations/bistrita-nasaud-pexels-5604101.jpg",
    imageAlt: "Lacul Colibița și munții din Bistrița-Năsăud",
    imagePosition: "50% 60%",
  },
  neamt: {
    image: "https://img.cabn.ro/explore/destinations/neamt-pexels-7409233.jpg",
    imageAlt: "Drumul printre stâncile din Cheile Bicazului, în județul Neamț",
    imagePosition: "50% 60%",
  },
};

const categoryPhotos: Record<string, ExplorePhoto> = {
  cabane: {
    image: "https://img.cabn.ro/listings/a1cc02f1-4ef4-4066-95cf-4c8b0767327c/card_1772559080526_3jw93kig3ct_IMG_6392.webp",
    imageAlt: "Cabană din lemn, cu ferestre mari și grădină",
    imagePosition: "50% 65%",
  },
  "a-frame": {
    image: "https://img.cabn.ro/listings/76b61c48-fbd9-42a8-b786-8b88eb9aa617/card_1772558014613_q6m9vot6tg_img1-1.webp",
    imageAlt: "Cabană A-Frame între brazi acoperiți de zăpadă",
    imagePosition: "50% 72%",
  },
  pensiuni: {
    image: "https://img.cabn.ro/listings/936e91fb-3f44-4805-90ab-0db915e4b1f4/card_1774283288101_bwwiaf4emr_6.webp",
    imageAlt: "Pensiune montană cu terasă și pădure în apropiere",
    imagePosition: "45% 55%",
  },
  apartamente: {
    image: "/images/categories/apartamente.jpg",
    imageAlt: "Imagine reprezentativă: living luminos într-un apartament",
    imagePosition: "50% 60%",
  },
  "tiny-house": {
    image: "https://img.cabn.ro/listings/32cb6ffd-cce8-4b97-abc6-e6d3a05c1031/card_1771882524111_egqteb5eo9_1.webp",
    imageAlt: "Tiny house din lemn, cu terasă și ciubăr în natură",
    imagePosition: "50% 55%",
  },
  "case-de-vacanta": {
    image: "https://img.cabn.ro/listings/136148ab-ea68-421f-9c2c-edbf3fa3e100/card_1772557584560_9nexls62ns_512-2.jpg-2-scaled.webp",
    imageAlt: "Casă de vacanță cu grădină și ciubăr, înconjurată de brazi",
    imagePosition: "45% 50%",
  },
};

export function getCategoryPhoto(typeSlug: string): ExplorePhoto {
  return categoryPhotos[typeSlug] || {};
}

export function getDestinationPhoto(countySlug: string): ExplorePhoto {
  return destinationPhotos[countySlug] || {};
}
