export interface PlaceInfo {
  name: string;
  address: string;
  rating: number | null;
  placeId: string;
  photoReference: string | null;
  lat: number | null;
  lng: number | null;
  types: string[];
}