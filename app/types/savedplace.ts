export interface SavedPlace {
  id: number;
  externalPlaceId: string;
  name: string;
  address: string;
  rating: number | null;
  photoReference: string | null;
  city?: string | null;
  lat?: number | null;
  lng?: number | null;
}