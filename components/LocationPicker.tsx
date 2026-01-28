'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';

interface LocationPickerProps {
  onLocationSelect: (location: { latitude: number; longitude: number; county: string; city: string; radius: number }) => void;
  initialCounty?: string;
  initialCity?: string;
  initialLat?: number | null;
  initialLng?: number | null;
}

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#334155' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#111827' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1f2937' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0b1220' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1f2937' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0b1220' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
];

export default function LocationPicker({ onLocationSelect, initialCounty, initialCity, initialLat, initialLng }: LocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [radius, setRadius] = useState(1);
  const radiusRef = useRef(1);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [predictions, setPredictions] = useState<any[]>([]);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const clampRadius = useCallback((r: number) => Math.max(0.5, Math.min(5, Math.round(r * 2) / 2)), []);

  const geocodeLocation = useCallback((lat: number, lng: number) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === google.maps.GeocoderStatus.OK && results?.[0]) {
        setLocationName(results[0].formatted_address);
      }
    });
  }, []);

  const reverseGeocodeAndSet = useCallback((lat: number, lng: number) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === google.maps.GeocoderStatus.OK && results?.[0]) {
        setLocationName(results[0].formatted_address);
      }
    });
  }, []);

  const updateMarkerAndCircle = useCallback((map: google.maps.Map, lat: number, lng: number) => {
    // Remove old marker and circle
    if (markerRef.current) markerRef.current.setMap(null);
    if (circleRef.current) circleRef.current.setMap(null);

    // Add marker
    markerRef.current = new google.maps.Marker({
      map,
      position: { lat, lng },
      title: 'Locația selectată',
    });
    markerRef.current.setDraggable(true);

    google.maps.event.addListener(markerRef.current, 'dragend', (event: google.maps.MapMouseEvent) => {
      const nextLat = event.latLng?.lat();
      const nextLng = event.latLng?.lng();
      if (nextLat === undefined || nextLng === undefined) return;
      setSelectedLocation({ lat: nextLat, lng: nextLng });
      setIsConfirmed(false);
    });

    // Add circle
    const nextRadius = clampRadius(radiusRef.current);
    circleRef.current = new google.maps.Circle({
      map,
      center: { lat, lng },
      radius: nextRadius * 1000, // Convert km to meters (clamped to 1-5km)
      fillColor: '#10b981',
      fillOpacity: 0.15,
      strokeColor: '#10b981',
      strokeOpacity: 0.8,
      strokeWeight: 2,
    });

    map.setCenter({ lat, lng });
  }, [clampRadius]);

  useEffect(() => {
    const getIsDark = () => document.documentElement.classList.contains('dark');
    setIsDarkMode(getIsDark());
    const observer = new MutationObserver(() => {
      setIsDarkMode(getIsDark());
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setOptions({ styles: isDarkMode ? DARK_MAP_STYLE : [] });
    }
  }, [isDarkMode]);

  // Load Google Maps script
  useEffect(() => {
    const hasGoogle = () => typeof window !== 'undefined' && !!(window as any).google?.maps;
    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) {
      if (hasGoogle()) {
        setIsLoaded(true);
        return;
      }
      const timer = window.setInterval(() => {
        if (hasGoogle()) {
          window.clearInterval(timer);
          setIsLoaded(true);
        }
      }, 50);
      return () => window.clearInterval(timer);
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (hasGoogle()) setIsLoaded(true);
    };
    script.onerror = () => console.error('Failed to load Google Maps');
    document.head.appendChild(script);
  }, []);

  // Seed selected location from initial coords (edit mode)
  useEffect(() => {
    if (typeof initialLat === 'number' && typeof initialLng === 'number') {
      if (Number.isFinite(initialLat) && Number.isFinite(initialLng) && (initialLat !== 0 || initialLng !== 0)) {
        setSelectedLocation({ lat: initialLat, lng: initialLng });
        setIsConfirmed(true);
        return;
      }
    }
  }, [initialLat, initialLng]);

  // Auto-center map on user's location (device) with IP fallback (add mode only)
  useEffect(() => {
    const hasInitialCoords =
      typeof initialLat === 'number' &&
      typeof initialLng === 'number' &&
      Number.isFinite(initialLat) &&
      Number.isFinite(initialLng) &&
      (initialLat !== 0 || initialLng !== 0);
    if (hasInitialCoords) return;
    let didSet = false;

    const setLocation = (lat: number, lng: number) => {
      didSet = true;
      setSelectedLocation({ lat, lng });
      setIsConfirmed(false);
      reverseGeocodeAndSet(lat, lng);
    };

    const getIPLocation = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        if (data.latitude && data.longitude && !didSet) {
          const lat = parseFloat(data.latitude);
          const lng = parseFloat(data.longitude);
          setLocation(lat, lng);
        }
      } catch (err) {
        console.error('IP geolocation error:', err);
        // Silently fail - use default center
      }
    };

    if (!navigator.geolocation) {
      getIPLocation();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation(pos.coords.latitude, pos.coords.longitude),
      () => getIPLocation(),
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 5 * 60 * 1000 },
    );
  }, [initialLat, initialLng, reverseGeocodeAndSet]);

  // Initialize map (always visible)
  useEffect(() => {
    if (!isLoaded || !mapContainerRef.current || !(window as any).google?.maps) return;

    const defaultCenter = { lat: 45.9432, lng: 24.9668 }; // Bucharest center
    const initialCenter = selectedLocation || defaultCenter; // Use detected location if available

    if (!mapRef.current) {
      const map = new google.maps.Map(mapContainerRef.current, {
        zoom: selectedLocation ? 14 : 10,
        center: initialCenter,
        mapTypeControl: false,
        streetViewControl: false,
        styles: isDarkMode ? DARK_MAP_STYLE : [],
      });
      mapRef.current = map;

      // Handle map clicks
      map.addListener('click', (e: google.maps.MapMouseEvent) => {
        const lat = e.latLng?.lat();
        const lng = e.latLng?.lng();

        if (lat !== undefined && lng !== undefined) {
          setSelectedLocation({ lat, lng });
          setIsConfirmed(false);
        }
      });

      // Add initial marker if location was detected
      if (selectedLocation) {
        updateMarkerAndCircle(map, selectedLocation.lat, selectedLocation.lng);
      }
    }
  }, [isLoaded, selectedLocation, updateMarkerAndCircle, isDarkMode]);

  // Setup autocomplete predictions
  useEffect(() => {
    if (!isLoaded || !searchValue) {
      setPredictions([]);
      return;
    }

    const service: any = new (google.maps.places as any).AutocompleteService();
    service.getPlacePredictions({ input: searchValue, types: ['geocode'] }, (preds: any[] | null) => {
      setPredictions(preds || []);
    });
  }, [searchValue, isLoaded]);

  useEffect(() => {
    radiusRef.current = radius;
  }, [radius]);

  useEffect(() => {
    if (!selectedLocation || !mapRef.current) return;
    updateMarkerAndCircle(mapRef.current, selectedLocation.lat, selectedLocation.lng);
    geocodeLocation(selectedLocation.lat, selectedLocation.lng);
  }, [selectedLocation, updateMarkerAndCircle, geocodeLocation]);

  const extractCountyCityFromPlace = (place: any) => {
    if (!place.address_components) return;
    let county = '';
    let city = '';
    for (const c of place.address_components) {
      if (c.types.includes('administrative_area_level_1') || c.types.includes('administrative_area_level_2')) {
        county = county || c.long_name;
      }
      if (c.types.includes('locality') || c.types.includes('postal_town') || c.types.includes('administrative_area_level_3')) {
        city = city || c.long_name;
      }
    }
    // values can be used on confirm; we extract them here for completeness
  };

  const onSelectPrediction = (prediction: any) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ placeId: prediction.place_id }, (results, status) => {
      if (status === google.maps.GeocoderStatus.OK && results?.[0]?.geometry?.location) {
        const loc = results[0].geometry.location;
        const lat = loc.lat();
        const lng = loc.lng();
        setSelectedLocation({ lat, lng });
        setIsConfirmed(false);
        setLocationName(results[0].formatted_address || prediction.description || '');
        setPredictions([]);

        // Auto-focus and zoom the map
        if (mapRef.current) {
          mapRef.current.setCenter({ lat, lng });
          mapRef.current.setZoom(15);
        }
      }
    });
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocația nu este disponibilă în acest browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setSelectedLocation({ lat, lng });
        setIsConfirmed(false);
        reverseGeocodeAndSet(lat, lng);

        // Auto-focus and zoom the map to the selected location
        if (mapRef.current) {
          mapRef.current.setCenter({ lat, lng });
          mapRef.current.setZoom(15);
        }
      },
      (err) => {
        console.error('Geolocation error', err);
        alert('Nu am putut obține locația. Poți folosi opțiunea de căutare.');
      },
    );
  };

  const handleRadiusChange = (newRadius: number) => {
    const clamped = clampRadius(newRadius);
    setRadius(clamped);
    setIsConfirmed(false);
    if (selectedLocation && mapRef.current) {
      if (circleRef.current) circleRef.current.setRadius(clamped * 1000);
    }
  };


  const handleConfirmLocation = async () => {
    if (!selectedLocation) {
      alert('Selectează o locație (folosind hartă sau căutare)');
      return;
    }

    // Try to reverse-geocode and extract county/city for better UX
    let county = initialCounty || '';
    let city = initialCity || '';
    try {
      const geocoder = new google.maps.Geocoder();
      await new Promise<void>((resolve) => {
        geocoder.geocode({ location: { lat: selectedLocation.lat, lng: selectedLocation.lng } }, (results, status) => {
          if (status === google.maps.GeocoderStatus.OK && results?.[0]) {
            const comps = results[0].address_components || [];
            for (const c of comps) {
              if (!county && (c.types.includes('administrative_area_level_1') || c.types.includes('administrative_area_level_2'))) county = c.long_name;
              if (!city && (c.types.includes('locality') || c.types.includes('postal_town') || c.types.includes('administrative_area_level_3'))) city = c.long_name;
            }
          }
          resolve();
        });
      });
    } catch (e) {
      // ignore geocoding failures, fallback to initial props
    }

    onLocationSelect({
      latitude: selectedLocation.lat,
      longitude: selectedLocation.lng,
      county: county || '',
      city: city || '',
      radius,
    });
    setIsConfirmed(true);
  };

  return (
    <div className="space-y-4">
      {/* Map always visible with integrated search and controls */}
      <div className="rounded-2xl border bg-white shadow-md overflow-hidden dark:border-zinc-800 dark:bg-zinc-900">
        {/* Header with search and location button */}
        <div className="p-4 border-b border-gray-200 space-y-3 bg-gradient-to-r from-white to-emerald-50 dark:border-zinc-800 dark:from-zinc-900 dark:to-emerald-900/20">
          {/* Search input */}
          <div className="relative">
            <input
              id="location-search-input"
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
              placeholder="🔍 Caută o adresă, localitate..."
              autoComplete="off"
              className="w-full px-4 py-3 pl-11 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition dark:border-zinc-700 dark:bg-zinc-950 dark:text-gray-100"
            />
            <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400 dark:text-gray-500" />

            {/* Autocomplete predictions dropdown */}
            {searchValue && predictions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 border border-gray-200 rounded-lg bg-white shadow-lg z-50 max-h-72 overflow-y-auto dark:border-zinc-800 dark:bg-zinc-900">
                {predictions.map((p, idx) => (
                  <button
                    key={p.place_id || idx}
                    type="button"
                    onClick={() => {
                      setSearchValue(p.description || '');
                      onSelectPrediction(p);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-emerald-50 border-b border-gray-100 last:border-b-0 transition flex items-start gap-3"
                  >
                    <MapPin className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0 dark:text-emerald-400" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate dark:text-gray-100">{p.main_text || p.description}</p>
                      {p.secondary_text && <p className="text-xs text-gray-500 truncate dark:text-gray-400">{p.secondary_text}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Use my location button */}
          <button
            type="button"
            onClick={handleUseMyLocation}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition font-medium shadow-md dark:bg-emerald-500 dark:hover:bg-emerald-600"
          >
            📍 Folosește locația mea
          </button>
        </div>

        {/* Map container */}
        <div ref={mapContainerRef} className="w-full h-96 bg-gray-50 dark:bg-zinc-900" />
      </div>

      {/* Location details panel (when location is selected) */}
      {selectedLocation && (
        <div className="space-y-4 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-5 rounded-xl border border-emerald-200 shadow-md dark:border-zinc-800 dark:from-zinc-900 dark:to-emerald-900/20">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-emerald-700 tracking-wide dark:text-emerald-300">LOCAȚIE SELECTATĂ</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">Poți da click pe hartă sau trage pinul pentru a ajusta poziția.</p>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                isConfirmed ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-700 border border-emerald-200 dark:bg-zinc-950 dark:text-emerald-300 dark:border-zinc-800'
              }`}
            >
              {isConfirmed ? 'Confirmată' : 'Neconfirmată'}
            </span>
          </div>

          {/* Address section */}
          {locationName && (
            <div>
              <p className="text-xs font-bold text-emerald-700 tracking-wide dark:text-emerald-300 mb-1">ADRESA</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{locationName}</p>
              <p className="text-xs text-gray-600 mt-2 font-mono opacity-75 dark:text-gray-400">
                {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
              </p>
            </div>
          )}

          {/* Radius slider section */}
          <div className="space-y-3 border-t border-emerald-200 pt-4 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-gray-900 dark:text-gray-100">Rază de confidențialitate</label>
              <span className="inline-flex items-center gap-1 bg-white px-3 py-1 rounded-full font-bold text-emerald-700 dark:bg-zinc-950 dark:text-emerald-300">
                {radius} <span className="text-xs">km</span>
              </span>
            </div>

            <input
              type="range"
              min="0.5"
              max="5"
              step="0.5"
              value={radius}
              onChange={(e) => handleRadiusChange(Number(e.target.value))}
              className="w-full h-2 bg-emerald-300 rounded-lg appearance-none cursor-pointer accent-emerald-600 dark:bg-emerald-900/60"
            />

            {/* Quick presets */}
            <div className="flex gap-2 flex-wrap">
              {[0.5, 1, 2, 5].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleRadiusChange(r)}
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                    radius === r
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-300 hover:border-emerald-400 dark:bg-zinc-950 dark:text-gray-200 dark:border-zinc-700 dark:hover:border-emerald-500'
                  }`}
                >
                  {r} km
                </button>
              ))}
            </div>

            <p className="text-xs text-gray-700 italic dark:text-gray-400">
              Afișăm o rază aproximativă pentru a ascunde locația exactă (maxim 5 km).
            </p>
          </div>

          {/* Confirm button */}
          <button
            type="button"
            onClick={handleConfirmLocation}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-lg font-semibold shadow-md hover:shadow-lg transition dark:bg-emerald-500 dark:hover:bg-emerald-600"
          >
            ✓ Confirmă locația
          </button>
        </div>
      )}
    </div>
  );
}



