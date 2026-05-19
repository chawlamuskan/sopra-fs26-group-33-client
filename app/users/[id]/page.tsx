"use client";
import { useLogout } from "@/hooks/useLogout";
import React, { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import useLocalStorage from "@/hooks/useLocalStorage";
import { User } from "@/types/user";
import { Button } from "antd";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import Header from "@/components/Header";
import {
  APIProvider,
  Map,
  MapMouseEvent,
  useMap,
  useMapsLibrary,
  AdvancedMarker,
} from "@vis.gl/react-google-maps";
import styles from "@/styles/page.module.css";
import popupStyles from "@/styles/placePopup.module.css";
import { ApiService } from "@/api/apiService";
import { PlaceInfo } from "@/types/placeinfo";
import InfoButton from "@/components/InfoButton";

interface CountryInfo {
  name: string;
  capital: string;
  population: number;
  flag: string;
  languages: string[];
  countryCode: string;
}

interface PopularPlace {
  externalPlaceId: string;
  name: string;
  photoReference?: string | null;
  count: number;
}

interface AddressComponent {
  types: string[];
  long_name: string;
  short_name: string;
}

interface TravelBoard {
  id: number;
  name: string;
  location?: string | null;
  countryCode?: string | null;
  privacy?: string;
  ownerId?: number;
}

interface PublicBoardPreview extends TravelBoard {
  previewPhotoReference?: string | null;
  ownerProfilePicture?: string | null;
}


const resolveCity = async (placeId: string): Promise<string | null> => {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?place_id=${placeId}&language=en&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
    );
    const data = await res.json();
    const components = data.results?.[0]?.address_components ?? [];
    
    
    const country = components
      .find((c: AddressComponent) => c.types.includes("country"))
      ?.short_name?.toLowerCase() ?? null;

    const locality = components
      .find((c: AddressComponent) => c.types.includes("locality"))
      ?.short_name?.toLowerCase() ?? null;

    // Store as "locality|country" so we can match on both
    if (locality && country) return `${locality}|${country}`;
    if (country) return `|${country}`;
    return null;
  } catch {
    return null;
  }
};

const getPlacePhotoUrl = (photoReference: string) =>
  `https://places.googleapis.com/v1/${photoReference}/media?maxWidthPx=400&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;

const ZoomTracker: React.FC<{ onZoomChange: (zoom: number) => void }> = ({
  onZoomChange,
}) => {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const listener = map.addListener("zoom_changed", () => {
      const zoom = map.getZoom();
      if (zoom !== undefined) onZoomChange(zoom);
    });
    return () => google.maps.event.removeListener(listener);
  }, [map, onZoomChange]);
  return null;
};

const PlaceClickInterceptor: React.FC<{
  onPlaceClick: (place: PlaceInfo) => void;
}> = ({ onPlaceClick }) => {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const ALLOWED_POI_TYPES = new Set([
      "restaurant", "cafe", "bar", "tourist_attraction", "museum",
      "park", "shopping_mall", "store", "lodging", "establishment",
    ]);
    const listener = map.addListener(
      "click",
      async (event: google.maps.MapMouseEvent & { placeId?: string }) => {
        if (!event.placeId) return;
        event.stop();
        try {
          const placeId = event.placeId;
          const response = await fetch(
            `https://places.googleapis.com/v1/places/${placeId}`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                "X-Goog-Api-Key": process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
                "X-Goog-FieldMask": "displayName,formattedAddress,rating,types,photos.name,location",
              },
            }
          );
          if (!response.ok) {
            console.error("Places API error:", await response.text());
            return;
          }
          const data = await response.json();
          const types: string[] = data.types ?? [];
          const isPOI = types.some((t) => ALLOWED_POI_TYPES.has(t));
          if (!isPOI) return;
          onPlaceClick({
            name: data.displayName?.text ?? "Unknown Place",
            address: data.formattedAddress ?? "No address available",
            rating: data.rating ?? null,
            placeId,
            photoReference: data.photos?.[0]?.name ?? null,
            lat: data.location?.latitude ?? null,
            lng: data.location?.longitude ?? null,
            types: types.filter((t) => ALLOWED_POI_TYPES.has(t)),
          });
        } catch (err) {
          console.error("Failed to fetch place details:", err);
        }
      }
    );
    return () => { google.maps.event.removeListener(listener); };
  }, [map, onPlaceClick]);
  return null;
};

const StarRating: React.FC<{ rating: number }> = ({ rating }) => {
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
  return (
    <span className={popupStyles.starRow}>
      {Array(fullStars).fill(null).map((_, i) => (
        <span key={`full-${i}`} className={popupStyles.starFull}>★</span>
      ))}
      {hasHalf && <span className={popupStyles.starHalf}>★</span>}
      {Array(emptyStars).fill(null).map((_, i) => (
        <span key={`empty-${i}`} className={popupStyles.starEmpty}>★</span>
      ))}
      <span className={popupStyles.ratingValue}>{rating.toFixed(1)}</span>
    </span>
  );
};

const PlaceCard: React.FC<{
  placeInfo: PlaceInfo;
  onClose: () => void;
  userId: string | undefined;
  token: string | undefined;
  apiService: ApiService;
}> = ({ placeInfo, onClose, userId, token, apiService }) => {
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showBoardSelector, setShowBoardSelector] = useState(false);
  const [travelBoards, setTravelBoards] = useState<{ id: number; name: string }[]>([]);
  const [boardFeedback, setBoardFeedback] = useState<string | null>(null);
  const [publicBoards, setPublicBoards] = useState<PublicBoardPreview[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchPublicBoardsForPlace = async () => {
      try {
        const boards = await apiService.get<TravelBoard[]>("/travelboards/public");
        const matchingBoards: PublicBoardPreview[] = [];
        for (const board of boards) {
          try {
            const places = await apiService.get<{ 
              externalPlaceId: string;
              photoReference?: string | null; 
            }[]>(`/travelboards/${board.id}/places`);

            const containsClickedPlace = places.some(
              (place) => place.externalPlaceId === placeInfo.placeId
            );
            
            if (containsClickedPlace) {
              let ownerProfilePicture: string | null = null;

              if (board.ownerId) {
                try {
                  const owner = await apiService.get<{ profilePicture?: string | null }>(
                    `/users/${board.ownerId}/preferences`
                  );
                  ownerProfilePicture = owner.profilePicture ?? null;
                } catch {
                  ownerProfilePicture = null;
                }
              }

              const previewPhotoReference =
                places.find((place) => place.photoReference)?.photoReference ?? null;
            
              matchingBoards.push({
                ...board,
                previewPhotoReference,
                ownerProfilePicture,
              });
            }
          } catch {
            // ignore boards where places cannot be fetched
          }
        }

        setPublicBoards([...matchingBoards].sort((a, b) => b.id - a.id)); //show the latest 6 boards
      } catch {
        setPublicBoards([]);
      }
    };

    fetchPublicBoardsForPlace();
  }, [apiService, placeInfo.placeId]);

  const handleAddToSaved = async () => {
    if (!userId) {
      setSavedFeedback("Not logged in.");
      setTimeout(() => setSavedFeedback(null), 2000);
      return;
    }
    setIsSaving(true);
    try {
      const city = await resolveCity(placeInfo.placeId);
      await apiService.post(`/users/${userId}/savedplaces`, {
        externalPlaceId: placeInfo.placeId,
        name: placeInfo.name,
        address: placeInfo.address,
        rating: placeInfo.rating,
        lat: placeInfo.lat,
        lng: placeInfo.lng,
        photoReference: placeInfo.photoReference ?? null,
        city,
        types: placeInfo.types,
      });
      setSavedFeedback("Saved to places!");
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      setSavedFeedback(status === 409 ? "Already saved!" : "Failed to save.");
    } finally {
      setIsSaving(false);
      setTimeout(() => setSavedFeedback(null), 2000);
    }
  };

  const handleOpenBoardSelector = async () => {
    try {
      const boards = await apiService.get<{ id: number; name: string }[]>("/travelboards");
      setTravelBoards(boards);
      setShowBoardSelector(true);
    } catch {
      setBoardFeedback("Failed to load boards.");
      setTimeout(() => setBoardFeedback(null), 2000);
    }
  };

  const handleAddToBoard = async (boardId: number) => {
    setShowBoardSelector(false);
    try {
      const city = await resolveCity(placeInfo.placeId);
      await apiService.post(`/travelboards/${boardId}/places`, {
        externalPlaceId: placeInfo.placeId,
        name: placeInfo.name,
        address: placeInfo.address,
        rating: placeInfo.rating,
        photoReference: placeInfo.photoReference ?? null,
        city, // ← send city
      });
      setBoardFeedback("Added to travel board!");
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      setBoardFeedback(status === 409 ? "Already in this board!" : "Failed to add.");
    } finally {
      setTimeout(() => setBoardFeedback(null), 2000);
    }
  };

  return (
    <div className={popupStyles.card} style={{ position: "relative" }}>
      <button className={popupStyles.closeBtn} onClick={onClose}>✕</button>
      <div className={popupStyles.headerRow}>
        <h3 className={popupStyles.placeName}>{placeInfo.name}</h3>
        <div className={popupStyles.headerActions}>
          <button
            className={popupStyles.iconBtn}
            onClick={handleAddToSaved}
            disabled={isSaving}
            title="Save place"
          >
            🔖
          </button>
          <button
            className={popupStyles.addToBoardBtn}
            onClick={handleOpenBoardSelector}
          >
            + add to travel board
          </button>
          {showBoardSelector && (
            <div style={{
              position: "absolute", background: "white", color: "black",
              border: "1px solid #ccc", borderRadius: "8px", padding: "8px",
              zIndex: 10, minWidth: "180px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}>
              <div style={{ fontWeight: "bold", marginBottom: "6px", fontSize: "13px" }}>
                Select a board:
              </div>
              {travelBoards.length === 0 && (
                <div style={{ fontSize: "12px", color: "#666" }}>No boards found.</div>
              )}
              {travelBoards.map((board) => (
                <div
                  key={board.id}
                  onClick={() => handleAddToBoard(board.id)}
                  style={{ padding: "6px 8px", cursor: "pointer", borderRadius: "6px", fontSize: "13px" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f0f0f0")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {board.name}
                </div>
              ))}
              <div
                onClick={() => setShowBoardSelector(false)}
                style={{ fontSize: "11px", color: "#999", cursor: "pointer", marginTop: "6px", textAlign: "center" }}
              >
                cancel
              </div>
            </div>
          )}
        </div>
      </div>
      <p className={popupStyles.address}>📍 {placeInfo.address}</p>
      <div className={popupStyles.gridSection}>
        <div className={popupStyles.gridLabel}>Featured in these public boards</div>       
        {publicBoards.length === 0 ? (
          <div
            style={{
              backgroundColor: "rgba(255,255,255,0.25)",
              borderRadius: "12px",
              padding: "14px",
              color: "white",
              fontWeight: 600,
              width: "100%",
            }}
          >
            No public boards feature this place yet.
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "12px",  
          }}>
            {publicBoards.slice(0, 6).map((board) => {
              const photoUrl = board.previewPhotoReference
                ? getPlacePhotoUrl(board.previewPhotoReference)
                : null;
            
              return (
                <div
                  key={board.id}
                  onClick={() => router.push(`/travelboards/${board.id}`)}
                  style={{
                    backgroundImage: photoUrl ? `url(${photoUrl})` : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    color: "white",
                    borderRadius: "14px",
                    minHeight: "115px",
                    cursor: "pointer",
                    overflow: "hidden",
                    display: "flex",
                    position: "relative",
                  }}
                >
                  {board.ownerProfilePicture ? (
                    <img
                      src={board.ownerProfilePicture}
                      alt="Board owner"
                      style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        width: "42px",
                        height: "42px",
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: "2px solid white",
                        zIndex: 2,
                      }}
                    />
                ) : (
                  <div
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      width: "42px",
                      height: "42px",
                      borderRadius: "50%",
                      backgroundColor: "#D6CECE",
                      color: "#0B0696",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "18px",
                      border: "2px solid white",
                      zIndex: 2,
                    }}
                  >
                    👤
                  </div>
                )}
                  <div
                    style={{
                      width: "100%",
                      padding: "10px",
                      background: "linear-gradient(transparent, rgba(0,0,0,0.75))",
                      display: "flex",
                      alignItems: "flex-end",
                      fontWeight: 700,
                      fontSize: "13px",
                    }}
                  >
                    {board.name}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className={popupStyles.divider} />
      <div className={popupStyles.ratingSection}>
        <span className={popupStyles.ratingLabel}>Rating from Google Maps</span>
        {placeInfo.rating !== null ? (
          <StarRating rating={placeInfo.rating} />
        ) : (
          <span className={popupStyles.noRating}>No rating available</span>
        )}
      </div>
      {savedFeedback && <p className={popupStyles.toast}>✓ {savedFeedback}</p>}
      {boardFeedback && <p className={popupStyles.toast}>✓ {boardFeedback}</p>}
    </div>
  );
};

const UserDashboard: React.FC = () => {
  const router = useRouter();
  const apiService = useApi();
  const logout = useLogout();
  const isAllowed = useProtectedRoute();
  const [countryInfo, setCountryInfo] = useState<CountryInfo | null>(null);
  const [placeInfo, setPlaceInfo] = useState<PlaceInfo | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(5);
  const [searchTarget, setSearchTarget] = useState<{ lat: number; lng: number } | null>(null);
  const position = { lat: 47.3769, lng: 8.5417 };
  const COUNTRY_LABEL_MAX_ZOOM = 6;
  const [showSavedPlaces, setShowSavedPlaces] = useState(false);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const searchParams = useSearchParams();
  const [popularCountryPlaces, setPopularCountryPlaces] = useState<PopularPlace[]>([]);

  type SavedPlace = {
    id: number;
    name: string;
    lat: number;
    lng: number;
    types: string[];
  };

  const CATEGORY_EMOJI: Record<string, string> = {
    restaurant: "🍽️",
    cafe: "☕",
    bar: "🍺",
    tourist_attraction: "🗽",
    museum: "🖼️",
    park: "🌳",
    shopping_mall: "🏪",
    store: "🛍️",
    lodging: "🏨",
    establishment: "🏛️", 
  };

  const getEmoji = (types: string[]) => {
    const meaningful = types.filter(t => t !== "establishment");
    const lookup = meaningful.length > 0 ? meaningful: types;
    for (const t of lookup) {
      if (CATEGORY_EMOJI[t]) return CATEGORY_EMOJI[t];
    }
    return "📍";
  };

  const fetchCountryInfo = async (countryCode: string) => {
    const countryRes = await fetch(
      `https://restcountries.com/v3.1/alpha/${countryCode}?fullText=true`
    );
    const countryData = await countryRes.json();
    if (!countryData || countryData.status === 404) return;
    const country = countryData[0];
    setCountryInfo({
      name: country.name.common,
      capital: country.capital?.[0] ?? "N/A",
      population: country.population,
      flag: country.flag,
      languages: Object.values(country.languages ?? {}),
      countryCode,
    });
  };

  const handleClick = async (event: MapMouseEvent) => {
    if (currentZoom > COUNTRY_LABEL_MAX_ZOOM) return;
    if (!event.detail.latLng) return;
    const { lat, lng } = event.detail.latLng;
    try {
      const geocodeReverse = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&result_type=country&language=en&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      );
      const geocodeData = await geocodeReverse.json();
      if (!geocodeData.results || geocodeData.results.length === 0) return;
      const countryCode = geocodeData.results[0].address_components[0].short_name;
      await fetchCountryInfo(countryCode);
    } catch (error) {
      console.error("Error fetching country info:", error);
    }
  };

  const handlePlaceClick = useCallback((place: PlaceInfo) => {
    setPlaceInfo(place);
  }, []);

  const showCountryPopup = countryInfo && currentZoom <= COUNTRY_LABEL_MAX_ZOOM;
  const storedUser = useLocalStorage<User | null>("user", null);

  const MapPanner: React.FC<{ target: { lat: number; lng: number } | null; onDone: () => void;}> = ({ target, onDone }) => {
    const map = useMap();
    useEffect(() => {
      if (!map || !target) return;
      map.panTo({ lat: target.lat, lng: target.lng });
      map.setZoom(15);
      onDone();
    }, [map, target]);
    return null;
  };

  useEffect(() => {
    if (!showSavedPlaces || !storedUser.value?.id) return;
    const fetchSaved = async () => {
      try {
        const data = await apiService.get<SavedPlace[]>(`/users/${storedUser.value!.id}/savedplaces`);
        setSavedPlaces(data);
      } catch {
        setSavedPlaces([]);
      }
    };
    fetchSaved();
  }, [showSavedPlaces, storedUser.value?.id, apiService]);

  useEffect(() => {
    const placeId = searchParams.get("placeId");
    if (!placeId) return;
    const fetchPlace = async () => {
      try {
        const response = await fetch(
          `https://places.googleapis.com/v1/places/${placeId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key":
                process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
              "X-Goog-FieldMask":
                "displayName,formattedAddress,rating,types,photos.name,location",
            },
          }
        );
        const data = await response.json();
        const place: PlaceInfo = {
          name: data.displayName?.text ?? "Unknown Place",
          address: data.formattedAddress ?? "",
          rating: data.rating ?? null,
          placeId,
          photoReference: data.photos?.[0]?.name ?? null,
          lat: data.location?.latitude ?? null,
          lng: data.location?.longitude ?? null,
          types: data.types ?? [],
        };
        setSearchTarget({lat: place.lat!,lng: place.lng!,});
        setPlaceInfo(place);
      } catch (err) {
        console.error(err);
      }
    };
    fetchPlace();
  }, [searchParams]);

  useEffect(() => {
    if (!countryInfo?.countryCode) return;

    const fetchPopularPlacesForCountry = async () => {
      try {
        const boards = await apiService.get<TravelBoard[]>("/travelboards/public");

        const countryBoards = boards.filter(
          (board) => board.countryCode === countryInfo.countryCode
        );

        const placeMap: Record<string, PopularPlace> = {};

        for (const board of countryBoards) {
          try {
            const places = await apiService.get<{
              externalPlaceId: string;
              name: string;
              photoReference?: string | null;
            }[]>(`/travelboards/${board.id}/places`);

            for (const place of places) {
              if (!placeMap[place.externalPlaceId]) {
                placeMap[place.externalPlaceId] = {
                  externalPlaceId: place.externalPlaceId,
                  name: place.name,
                  photoReference: place.photoReference ?? null,
                  count: 0,
                };
              }

              placeMap[place.externalPlaceId].count += 1;
            }
          } catch {
            // ignore boards whose places cannot be fetched
          }
        }

        const popularPlaces = Object.values(placeMap)
          .sort((a, b) => b.count - a.count)
          .slice(0, 9);

        setPopularCountryPlaces(popularPlaces);
      } catch {
        setPopularCountryPlaces([]);
      }
    };

    fetchPopularPlacesForCountry();
  }, [apiService, countryInfo?.countryCode]);


  if (isAllowed === null) return null;
  if (!isAllowed) return null;

  return (
    
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <>
      <Header 
      onPlaceSelect={(lat, lng, place) => {
        setSearchTarget({ lat, lng });
        setPlaceInfo(place);
        }} 
        onToggleSavedPlaces={setShowSavedPlaces}
            />
      <InfoButton />
        <main className={styles.main}>
        
          <div style={{ height: "100vh", width: "100vw", position: "relative", overflow: "hidden" }}>
            <Map
              mapId="3acb2fe9409f1015648d998e"
              defaultZoom={5}
              defaultCenter={position}
              gestureHandling="greedy"
              disableDefaultUI
              onClick={handleClick}
            >
              <ZoomTracker onZoomChange={setCurrentZoom} />
              <PlaceClickInterceptor onPlaceClick={handlePlaceClick} />
              <MapPanner 
              target={searchTarget}
              onDone={() => setSearchTarget(null)} />

              {showCountryPopup && (
                <div style={{
                  position: "absolute", top: "40%", right: "10%",
                  transform: "translateY(-50%)",
                  backgroundColor: "#0B0696F0", color: "white",
                  borderRadius: "16px", padding: "24px", width: "320px",
                  zIndex: 1000, boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                }}>
                  <button
                    onClick={() => setCountryInfo(null)}
                    style={{
                      position: "absolute", top: "10px", right: "14px",
                      background: "none", border: "none", color: "white",
                      fontSize: "18px", cursor: "pointer",
                    }}
                  >✕</button>
                  <h2 style={{ textAlign: "center", marginBottom: "16px" }}>
                    {countryInfo.name}
                  </h2>
                  <div style={{ display: "flex", gap: "16px", alignItems: "center", marginBottom: "16px" }}>
                    <span style={{ fontSize: "48px" }}>{countryInfo.flag}</span>
                    <div>
                      <p><strong>Capital:</strong> {countryInfo.capital}</p>
                      <p><strong>Population:</strong> {(countryInfo.population / 1_000_000).toFixed(2)} mill.</p>
                      <p><strong>Language(s):</strong> {countryInfo.languages.join(", ")}</p>
                    </div>
                  </div>
                  <div style={{ marginTop: "12px" }}>
                  <p style={{ textAlign: "center", fontWeight: "bold" }}>
                    Popular Places
                  </p>

                  {popularCountryPlaces.length === 0 ? (
                    <div
                      style={{
                        backgroundColor: "#1a3a8f",
                        borderRadius: "8px",
                        padding: "10px",
                        textAlign: "center",
                      }}
                    >
                      No popular places yet
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: "8px",
                        marginTop: "10px",
                      }}
                    >
                      {popularCountryPlaces.map((place) => {
                        const photoUrl = place.photoReference
                          ? getPlacePhotoUrl(place.photoReference)
                          : null;
                      
                        return (
                          <div
                            key={place.externalPlaceId}
                            onClick={() => router.push(`/users/${storedUser.value?.id}?placeId=${place.externalPlaceId}`)}
                            style={{
                              backgroundImage: photoUrl
                                ? `linear-gradient(rgba(0,0,0,0.25), rgba(0,0,0,0.45)), url(${photoUrl})`
                                : undefined,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                              backgroundColor: "rgba(255,255,255,0.16)",
                              borderRadius: "12px",
                              height: "90px",
                              cursor: "pointer",
                              position: "relative",
                              overflow: "hidden",
                              display: "flex",
                              alignItems: "flex-end",
                              padding: "8px",
                            }}
                          >
                            {!photoUrl && (
                              <div
                                style={{
                                  position: "absolute",
                                  inset: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "30px",
                                  opacity: 0.25,
                                }}
                              >
                                📍
                              </div>
                            )}
                            <div style={{ zIndex: 1 }}>
                              <div
                                style={{
                                  fontWeight: 650,
                                  fontSize: "12px",
                                  lineHeight: "1.1",
                                }}
                              >
                                {place.name}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  </div>
                </div>
              )}
            </Map>

            {placeInfo && (
              <div className={popupStyles.cardWrapper}>
                <PlaceCard
                  placeInfo={placeInfo}
                  onClose={() => setPlaceInfo(null)}
                  userId={storedUser.value?.id}
                  token={storedUser.value?.token}
                  apiService={apiService}
                />
              </div>
            )}

            {showSavedPlaces && savedPlaces.map((place) => (
              <div key={place.id} style={{ position: "absolute" }}>
                {/* @vis.gl/react-google-maps AdvancedMarker */}
                <AdvancedMarker
                  position={{ lat: place.lat, lng: place.lng }}
                  title={place.name}
                >
                  <div style={{
                    fontSize: "25px",
                    background: "white",
                    borderRadius: "50%",
                    width: "36px",
                    height: "36px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                    border: "1.5px solid #e0e0e0",
                    //filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))",
                    cursor: "pointer",
                  }}>
                    {getEmoji(place.types)}
                  </div>
                </AdvancedMarker>
              </div>
            ))}
          </div>
        
      </main>
    </>
    </APIProvider>
  );
};

export default UserDashboard;