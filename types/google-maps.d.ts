declare namespace google {
  namespace maps {
    interface MapOptions {
      zoom?: number;
      center?: LatLng | LatLngLiteral;
      mapTypeControl?: boolean;
      [key: string]: any;
    }

    interface LatLng {
      lat(): number;
      lng(): number;
    }

    interface LatLngLiteral {
      lat: number;
      lng: number;
    }

    interface MapMouseEvent {
      latLng?: LatLng;
    }

    interface CircleOptions {
      map?: Map;
      center?: LatLng | LatLngLiteral;
      radius?: number;
      fillColor?: string;
      fillOpacity?: number;
      strokeColor?: string;
      strokeOpacity?: number;
      strokeWeight?: number;
    }

    interface GeocoderResult {
      formatted_address: string;
      geometry: {
        location: LatLng;
        bounds?: LatLngBounds;
      };
      [key: string]: any;
    }

    interface LatLngBounds {
      [key: string]: any;
    }

    enum GeocoderStatus {
      OK = 'OK',
    }

    interface MarkerOptions {
      map?: Map;
      position?: LatLng | LatLngLiteral;
      title?: string;
    }

    enum ControlPosition {
      TOP_LEFT = 0,
    }

    class Map {
      constructor(element: HTMLElement, options: MapOptions);
      getCenter(): LatLng | undefined;
      setCenter(latlng: LatLng | LatLngLiteral): void;
      setZoom(zoom: number): void;
      fitBounds(bounds: LatLngBounds): void;
      setMapTypeId(mapTypeId: string): void;
      set(key: string, value: any): void;
      addListener(eventName: string, handler: Function): void;
      controls: ControlPosition[];
    }

    class Marker {
      constructor(options: MarkerOptions);
      setMap(map: Map | null): void;
      setDraggable(draggable: boolean): void;
    }

    class Circle {
      constructor(options: CircleOptions);
      setMap(map: Map | null): void;
      setRadius(radius: number): void;
    }

    class Geocoder {
      geocode(request: GeocoderRequest, callback: (results: GeocoderResult[] | null, status: GeocoderStatus) => void): void;
    }

    interface GeocoderRequest {
      location?: LatLng | LatLngLiteral;
      [key: string]: any;
    }

    namespace places {
      interface SearchBoxOptions {
        bounds?: LatLngBounds;
      }

      interface PlacesResult {
        formatted_address?: string;
        geometry?: {
          location: LatLng;
          bounds?: LatLngBounds;
        };
        [key: string]: any;
      }

      class SearchBox {
        constructor(inputElement: HTMLInputElement, options?: SearchBoxOptions);
        addListener(eventName: string, handler: Function): void;
        getPlaces(): PlacesResult[];
      }
    }

    namespace event {
      function addListener(instance: any, eventName: string, handler: Function): void;
    }
  }
}
