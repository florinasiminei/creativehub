import { useCallback, useEffect, useMemo, useState } from 'react';

type LocationsData = Record<string, Array<{ nume: string }>>;

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/^(judetul|judet|municipiul|municipiu|orasul|oras|comuna|satul)\s+/, '')
    .replace(/\s+county$/, '')
    .trim();

export default function useCountyLocalityData(judet: string, localitate: string) {
  const [locationsData, setLocationsData] = useState<LocationsData | null>(null);
  const [locationsError, setLocationsError] = useState<string | null>(null);
  const [countyQuery, setCountyQuery] = useState('');
  const [cityQuery, setCityQuery] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadLocations() {
      try {
        const resp = await fetch('/data/ro-orase-dupa-judet.min.json');
        if (!resp.ok) throw new Error('Nu am putut incarca judetele.');
        const data = (await resp.json()) as LocationsData;
        if (mounted) setLocationsData(data);
      } catch (err) {
        if (!mounted) return;
        setLocationsError(err instanceof Error ? err.message : 'Eroare la incarcarea localitatilor.');
      }
    }

    loadLocations();

    return () => {
      mounted = false;
    };
  }, []);

  const counties = useMemo(() => (locationsData ? Object.keys(locationsData) : []), [locationsData]);

  const filteredCounties = useMemo(() => {
    const query = normalize(countyQuery);
    if (!query) return counties;
    return counties.filter((county) => normalize(county).includes(query));
  }, [counties, countyQuery]);

  const resolvedCounty = useMemo(() => {
    if (!locationsData || !judet) return '';
    if (locationsData[judet]) return judet;
    const normalizedCounty = normalize(judet);
    return counties.find((county) => normalize(county) === normalizedCounty) || '';
  }, [locationsData, judet, counties]);

  const localities = useMemo(() => {
    if (!locationsData || !resolvedCounty) return [];
    return locationsData[resolvedCounty] || [];
  }, [locationsData, resolvedCounty]);

  const resolvedLocality = useMemo(() => {
    if (!resolvedCounty || !localitate) return '';
    const normalizedLocality = normalize(localitate);
    return localities.find((loc) => normalize(loc.nume) === normalizedLocality)?.nume || '';
  }, [resolvedCounty, localitate, localities]);

  const filteredLocalities = useMemo(() => {
    const query = normalize(cityQuery);
    if (!query) return localities;
    return localities.filter((loc) => normalize(loc.nume).includes(query));
  }, [localities, cityQuery]);

  const countyHasMatch = !judet || Boolean(resolvedCounty);
  const localityHasMatch = !localitate || Boolean(resolvedLocality);

  const resolveAdministrativeLocation = useCallback((county: string, city: string) => {
    const matchedCounty = counties.find((item) => normalize(item) === normalize(county));
    const matchedCity = matchedCounty
      ? locationsData?.[matchedCounty]?.find((item) => normalize(item.nume) === normalize(city))?.nume
      : null;
    return { county: matchedCounty || county, city: matchedCity || city };
  }, [counties, locationsData]);

  return {
    locationsReady: locationsData !== null,
    locationsError,
    countyQuery,
    cityQuery,
    setCountyQuery,
    setCityQuery,
    filteredCounties,
    filteredLocalities,
    resolvedCounty,
    resolvedLocality,
    countyHasMatch,
    localityHasMatch,
    resolveAdministrativeLocation,
  };
}
