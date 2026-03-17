"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

interface LocationPickerProps {
  onLocationSelect: (location: { latitude: number; longitude: number; county: string; city: string }) => void;
  initialCounty?: string;
  initialCity?: string;
  geocodeCounty?: string;
  geocodeCity?: string;
  initialLat?: number | null;
  initialLng?: number | null;
  onConfirmChange?: (confirmed: boolean) => void;
  autoLocate?: boolean;
}

type Prediction = {
  place_id: string;
  description?: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
};

type LegacyAutocompleteService = {
  getPlacePredictions: (
    request: {
      input: string;
      types: string[];
      componentRestrictions: { country: string };
    },
    callback: (predictions: Prediction[] | null) => void
  ) => void;
};

const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#0f172a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0f172a" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#334155" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#111827" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b7280" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1f2937" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#0b1220" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#1f2937" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0b1220" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
];

let googleMapsLoadPromise: Promise<void> | null = null;

function hasGoogleMapsCore() {
  return (
    typeof window !== "undefined" &&
    typeof google !== "undefined" &&
    Boolean(google.maps) &&
    typeof google.maps.Map === "function" &&
    typeof google.maps.Geocoder === "function"
  );
}

function hasGoogleMapsPlaces() {
  return Boolean(
    hasGoogleMapsCore() &&
      google.maps.places &&
      typeof (google.maps.places as unknown as { AutocompleteService?: unknown }).AutocompleteService === "function"
  );
}

function hasGoogleMapsApiReady() {
  return hasGoogleMapsCore() && hasGoogleMapsPlaces();
}

function loadGoogleMapsApi(apiKey: string) {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps poate fi incarcat doar in browser."));
  }

  if (hasGoogleMapsApiReady()) {
    return Promise.resolve();
  }

  if (googleMapsLoadPromise) {
    return googleMapsLoadPromise;
  }

  googleMapsLoadPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById("google-maps-script") as HTMLScriptElement | null;
    const needsReplacement =
      !!existingScript &&
      (existingScript.src.includes("callback=") ||
        !existingScript.src.includes("libraries=places") ||
        !existingScript.src.includes("loading=async"));
    const startedAt = Date.now();

    const cleanup = () => {
      window.clearInterval(intervalId);
      if (script) {
        script.removeEventListener("error", handleError);
      }
    };

    const handleError = () => {
      cleanup();
      googleMapsLoadPromise = null;
      reject(new Error("Google Maps nu a putut fi incarcat."));
    };

    const checkReady = () => {
      if (hasGoogleMapsApiReady()) {
        cleanup();
        resolve();
        return;
      }

      if (Date.now() - startedAt > 15000) {
        cleanup();
        googleMapsLoadPromise = null;
        reject(new Error("Google Maps nu a devenit disponibil in timp util."));
      }
    };

    const script = needsReplacement ? document.createElement("script") : existingScript ?? document.createElement("script");
    const intervalId = window.setInterval(checkReady, 50);

    if (needsReplacement) {
      existingScript?.remove();
    }

    if (!existingScript || needsReplacement) {
      const scriptUrl = new URL("https://maps.googleapis.com/maps/api/js");
      scriptUrl.searchParams.set("key", apiKey);
      scriptUrl.searchParams.set("libraries", "places");
      scriptUrl.searchParams.set("loading", "async");

      script.id = "google-maps-script";
      script.src = scriptUrl.toString();
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    script.addEventListener("error", handleError, { once: true });
    checkReady();
  });

  return googleMapsLoadPromise;
}

export default function LocationPicker({
  onLocationSelect,
  initialCounty,
  initialCity,
  geocodeCounty,
  geocodeCity,
  initialLat,
  initialLng,
  onConfirmChange,
  autoLocate = true,
}: LocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const lastGeocodeKeyRef = useRef("");
  const hasSelection = Boolean(selectedLocation);

  useEffect(() => {
    onConfirmChange?.(isConfirmed);
  }, [isConfirmed, onConfirmChange]);

  const updateLocationName = useCallback((lat: number, lng: number) => {
    if (!hasGoogleMapsCore()) return;

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === google.maps.GeocoderStatus.OK && results?.[0]) {
        setLocationName(results[0].formatted_address);
      }
    });
  }, []);

  const updateMarker = useCallback((map: google.maps.Map, lat: number, lng: number) => {
    if (!hasGoogleMapsCore() || typeof google.maps.Marker !== "function") return;

    if (markerRef.current) markerRef.current.setMap(null);

    const marker = new google.maps.Marker({
      map,
      position: { lat, lng },
      title: "Locatia selectata",
    });
    marker.setDraggable(true);

    google.maps.event.addListener(marker, "dragend", (event: google.maps.MapMouseEvent) => {
      const nextLat = event.latLng?.lat();
      const nextLng = event.latLng?.lng();
      if (nextLat === undefined || nextLng === undefined) return;
      setSelectedLocation({ lat: nextLat, lng: nextLng });
      setIsConfirmed(false);
    });

    markerRef.current = marker;
    map.setCenter({ lat, lng });
  }, []);

  useEffect(() => {
    const getIsDark = () => document.documentElement.classList.contains("dark");
    setIsDarkMode(getIsDark());

    const observer = new MutationObserver(() => {
      setIsDarkMode(getIsDark());
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setMapTypeId("roadmap");
    mapRef.current.set("styles", isDarkMode ? DARK_MAP_STYLE : []);
  }, [isDarkMode]);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error("Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");
      return;
    }

    let active = true;

    loadGoogleMapsApi(apiKey)
      .then(() => {
        if (active) setIsLoaded(true);
      })
      .catch((error) => {
        console.error(error);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (typeof initialLat !== "number" || typeof initialLng !== "number") return;
    if (!Number.isFinite(initialLat) || !Number.isFinite(initialLng)) return;
    if (initialLat === 0 && initialLng === 0) return;

    setSelectedLocation({ lat: initialLat, lng: initialLng });
    setIsConfirmed(true);
  }, [initialLat, initialLng]);

  useEffect(() => {
    if (!isLoaded || !hasGoogleMapsCore()) return;

    const city = (geocodeCity || "").trim();
    const county = (geocodeCounty || "").trim();
    if (!city && !county) return;
    if (city.length < 2 && county.length < 2) return;

    const key = `${city}|${county}`.toLowerCase();
    if (lastGeocodeKeyRef.current === key) return;
    lastGeocodeKeyRef.current = key;

    const geocoder = new google.maps.Geocoder();
    const query = [city, county, "Romania"].filter(Boolean).join(", ");

    geocoder.geocode({ address: query, region: "RO", componentRestrictions: { country: "RO" } }, (results, status) => {
      if (status !== google.maps.GeocoderStatus.OK || !results?.[0]?.geometry?.location) return;

      const location = results[0].geometry.location;
      setSelectedLocation({ lat: location.lat(), lng: location.lng() });
      setIsConfirmed(false);
      setLocationName(results[0].formatted_address || query);
    });
  }, [geocodeCity, geocodeCounty, isLoaded]);

  useEffect(() => {
    const hasInitialCoords =
      typeof initialLat === "number" &&
      typeof initialLng === "number" &&
      Number.isFinite(initialLat) &&
      Number.isFinite(initialLng) &&
      (initialLat !== 0 || initialLng !== 0);

    if (hasInitialCoords || !autoLocate) return;

    let didSet = false;

    const setLocation = (lat: number, lng: number) => {
      didSet = true;
      setSelectedLocation({ lat, lng });
      setIsConfirmed(false);
    };

    const getIpLocation = async () => {
      try {
        const response = await fetch("https://ipapi.co/json/");
        const data = await response.json();
        if (!data.latitude || !data.longitude || didSet) return;

        setLocation(parseFloat(data.latitude), parseFloat(data.longitude));
      } catch (error) {
        console.error("IP geolocation error:", error);
      }
    };

    if (!navigator.geolocation) {
      getIpLocation();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => setLocation(position.coords.latitude, position.coords.longitude),
      () => getIpLocation(),
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 5 * 60 * 1000 }
    );
  }, [autoLocate, initialLat, initialLng]);

  useEffect(() => {
    if (!isLoaded || !mapContainerRef.current || !hasGoogleMapsCore()) return;

    const defaultCenter = { lat: 45.9432, lng: 24.9668 };
    const initialCenter = selectedLocation || defaultCenter;

    if (!mapRef.current) {
      if (typeof google.maps.Map !== "function") return;

      const map = new google.maps.Map(mapContainerRef.current, {
        zoom: selectedLocation ? 14 : 10,
        center: initialCenter,
        mapTypeControl: false,
        streetViewControl: false,
        styles: isDarkMode ? DARK_MAP_STYLE : [],
      });

      map.addListener("click", (event: google.maps.MapMouseEvent) => {
        const lat = event.latLng?.lat();
        const lng = event.latLng?.lng();
        if (lat === undefined || lng === undefined) return;

        setSelectedLocation({ lat, lng });
        setIsConfirmed(false);
      });

      mapRef.current = map;

      if (selectedLocation) {
        updateMarker(map, selectedLocation.lat, selectedLocation.lng);
      }
    }
  }, [isDarkMode, isLoaded, selectedLocation, updateMarker]);

  useEffect(() => {
    if (!isLoaded || !searchValue || !hasGoogleMapsPlaces()) {
      setPredictions([]);
      return;
    }

    const service = new (google.maps.places as unknown as { AutocompleteService: new () => LegacyAutocompleteService })
      .AutocompleteService();
    service.getPlacePredictions(
      { input: searchValue, types: ["geocode"], componentRestrictions: { country: "ro" } },
      (nextPredictions) => {
        setPredictions(nextPredictions || []);
      }
    );
  }, [isLoaded, searchValue]);

  useEffect(() => {
    if (!selectedLocation) return;

    if (mapRef.current) {
      updateMarker(mapRef.current, selectedLocation.lat, selectedLocation.lng);
    }

    if (isLoaded) {
      updateLocationName(selectedLocation.lat, selectedLocation.lng);
    }
  }, [isLoaded, selectedLocation, updateLocationName, updateMarker]);

  const onSelectPrediction = (prediction: Prediction) => {
    if (!hasGoogleMapsCore()) return;

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ placeId: prediction.place_id }, (results, status) => {
      if (status !== google.maps.GeocoderStatus.OK || !results?.[0]?.geometry?.location) return;

      const location = results[0].geometry.location;
      const lat = location.lat();
      const lng = location.lng();

      setSelectedLocation({ lat, lng });
      setIsConfirmed(false);
      setLocationName(results[0].formatted_address || prediction.description || "");
      setPredictions([]);

      if (!mapRef.current) return;
      mapRef.current.setCenter({ lat, lng });
      mapRef.current.setZoom(15);
    });
  };

  const handleSearchSubmit = useCallback(() => {
    const query = searchValue.trim();
    if (!query || !hasGoogleMapsCore()) return;

    setIsSearching(true);
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: query, region: "RO", componentRestrictions: { country: "RO" } }, (results, status) => {
      setIsSearching(false);

      if (status !== google.maps.GeocoderStatus.OK || !results?.[0]?.geometry?.location) {
        alert("Nu am gasit adresa cautata. Incearca o denumire mai precisa.");
        return;
      }

      const location = results[0].geometry.location;
      const lat = location.lat();
      const lng = location.lng();

      setSelectedLocation({ lat, lng });
      setIsConfirmed(false);
      setLocationName(results[0].formatted_address || query);
      setPredictions([]);

      if (!mapRef.current) return;
      mapRef.current.setCenter({ lat, lng });
      mapRef.current.setZoom(15);
    });
  }, [searchValue]);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocatia nu este disponibila in acest browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setSelectedLocation({ lat, lng });
        setIsConfirmed(false);

        if (!mapRef.current) return;
        mapRef.current.setCenter({ lat, lng });
        mapRef.current.setZoom(15);
      },
      (error) => {
        console.error("Geolocation error", error);
        alert("Nu am putut obtine locatia. Poti folosi cautarea manuala.");
      }
    );
  };

  const handleConfirmLocation = async () => {
    if (!selectedLocation) {
      alert("Selecteaza o locatie folosind harta sau cautarea.");
      return;
    }

    let county = initialCounty || "";
    let city = initialCity || "";

    try {
      if (!hasGoogleMapsCore()) throw new Error("Google Maps nu este inca disponibil.");

      const geocoder = new google.maps.Geocoder();
      await new Promise<void>((resolve) => {
        geocoder.geocode({ location: { lat: selectedLocation.lat, lng: selectedLocation.lng } }, (results, status) => {
          if (status === google.maps.GeocoderStatus.OK && results?.[0]) {
            for (const component of results[0].address_components || []) {
              if (
                !county &&
                (component.types.includes("administrative_area_level_1") ||
                  component.types.includes("administrative_area_level_2"))
              ) {
                county = component.long_name;
              }

              if (
                !city &&
                (component.types.includes("locality") ||
                  component.types.includes("postal_town") ||
                  component.types.includes("administrative_area_level_3"))
              ) {
                city = component.long_name;
              }
            }
          }

          resolve();
        });
      });
    } catch {
      // Keep whatever is already available in the form state.
    }

    onLocationSelect({
      latitude: selectedLocation.lat,
      longitude: selectedLocation.lng,
      county,
      city,
    });

    setIsConfirmed(true);
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border bg-white shadow-md dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-gray-200 bg-gradient-to-r from-white to-emerald-50 p-4 dark:border-zinc-800 dark:from-zinc-900 dark:to-emerald-900/20">
          <div className="space-y-2">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <input
                  id="location-search-input"
                  type="text"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    event.stopPropagation();
                    handleSearchSubmit();
                  }}
                  placeholder="Cauta o adresa sau o localitate"
                  autoComplete="off"
                  className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 pl-11 text-base text-gray-900 shadow-sm transition focus:border-transparent focus:ring-2 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-gray-100 sm:h-9 sm:text-sm"
                />
                <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400 dark:text-gray-500" />

                {searchValue && predictions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                    {predictions.map((prediction, index) => (
                      <button
                        key={prediction.place_id || index}
                        type="button"
                        onClick={() => {
                          setSearchValue(prediction.description || "");
                          onSelectPrediction(prediction);
                        }}
                        className="flex w-full items-start gap-3 border-b border-gray-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-emerald-50"
                      >
                        <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                            {prediction.structured_formatting?.main_text || prediction.description}
                          </p>
                          {prediction.structured_formatting?.secondary_text && (
                            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                              {prediction.structured_formatting.secondary_text}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <button
                  type="button"
                  onClick={handleSearchSubmit}
                  disabled={isSearching || !searchValue.trim()}
                  className="h-11 w-full rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 sm:h-9 sm:w-auto"
                >
                  {isSearching ? "Caut..." : "Cauta"}
                </button>
                <button
                  type="button"
                  onClick={handleUseMyLocation}
                  className="h-11 w-full rounded-lg border border-emerald-200 bg-white px-3 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-zinc-900 dark:text-emerald-300 sm:h-9 sm:w-auto"
                >
                  Locatia mea
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Poti folosi cautarea directa sau sugestiile generate automat.
            </p>
          </div>
        </div>

        <div ref={mapContainerRef} className="h-72 w-full bg-gray-50 dark:bg-zinc-900 sm:h-96" />
      </div>

      <div className="space-y-4 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-5 shadow-md dark:border-zinc-800 dark:from-zinc-900 dark:to-emerald-900/20">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold tracking-wide text-emerald-700 dark:text-emerald-300">
              {hasSelection ? "LOCATIE SELECTATA" : "ALEGE O LOCATIE"}
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {hasSelection
                ? "Poti da click pe harta sau trage pinul pentru a ajusta pozitia."
                : "Selecteaza o locatie pe harta sau cauta o adresa pentru a continua."}
            </p>
          </div>

          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
              isConfirmed
                ? "bg-emerald-600 text-white"
                : "border border-emerald-200 bg-white text-emerald-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-emerald-300"
            }`}
          >
            {isConfirmed ? "Confirmata" : "Neconfirmata"}
          </span>
        </div>

        <div className="min-h-[52px]">
          <p className="mb-1 text-xs font-bold tracking-wide text-emerald-700 dark:text-emerald-300">ADRESA</p>
          {locationName ? (
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{locationName}</p>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">Nu ai selectat inca o locatie.</p>
          )}

          <p
            className={`mt-2 font-mono text-xs text-gray-600 opacity-75 dark:text-gray-400 ${
              selectedLocation ? "" : "opacity-0"
            }`}
          >
            {selectedLocation ? `${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}` : "0,0"}
          </p>
        </div>

        <button
          type="button"
          onClick={handleConfirmLocation}
          disabled={!hasSelection}
          className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white shadow-md transition hover:bg-emerald-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:hover:bg-emerald-600"
        >
          Confirma locatia
        </button>
      </div>
    </div>
  );
}
