export const ALLOWED_POI_TYPES = [
  "restaurant",
  "cafe",
  "bar",
  "tourist_attraction",
  "museum",
  "park",
  "shopping_mall",
  "store",
  "lodging",
] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  restaurant: "Restaurants",
  cafe: "Cafés",
  bar: "Bars",
  tourist_attraction: "Tourist Attractions",
  museum: "Museums",
  park: "Parks",
  shopping_mall: "Shopping",
  store: "Stores",
  lodging: "Hotels",
};

export const CATEGORY_ROUTES: Record<string, string> = {
  restaurant: "restaurant",
  cafe: "cafe",
  bar: "bar",
  tourist_attraction: "tourist_attraction",
  museum: "museum",
  park: "park",
  shopping_mall: "shopping_mall",
  store: "store",
  lodging: "lodging",
};
