"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebaseClient";
import type { User } from "firebase/auth";
import Image from "next/image";
import { getApiUrl } from "@/lib/env";
import CategoryFilter from "@/app/components/CategoryFilter";
import UnifiedHeader from "@/app/components/UnifiedHeader";

type MatchColor = "green" | "yellow" | "red";

type MatchResult = {
  vacante: {
    id: string;
    title: string;
    company: string;
    branchName: string;
    lat: number;
    lng: number;
  };
  score: number;
  color: MatchColor;
  percentage: string;
};

type PerfilResponse = {
  ok: boolean;
  candidato: any | null;
  profileCompleted: boolean;
};

const defaultCenter = { lat: -33.4372, lng: -70.6506 };

const routejobMapStyle: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#020617" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#e5e7eb" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#020617" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#111827" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#1e293b" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#020617" }],
  },
];

function loadGoogleMaps(apiKey: string): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return;
    if ((window as any).google && (window as any).google.maps) {
      resolve((window as any).google);
      return;
    }

    const existing = document.getElementById("google-maps-script");
    if (existing) {
      existing.addEventListener("load", () => resolve((window as any).google));
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve((window as any).google);
    script.onerror = (e) => reject(e);
    document.head.appendChild(script);
  });
}

export default function MapaVacantesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [perfil, setPerfil] = useState<PerfilResponse | null>(null);
  const [loadingPerfil, setLoadingPerfil] = useState(true);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [ubicacionError, setUbicacionError] = useState<string | null>(null);

  const [vacantes, setVacantes] = useState<MatchResult[]>([]);
  const [loadingVacantes, setLoadingVacantes] = useState(false);

  const [mapReady, setMapReady] = useState(false);

  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<any | null>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any | null>(null);
  const infoWindowRef = useRef<any | null>(null);

  const router = useRouter();

  // notificaciones
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  // cargar conteo de notificaciones
  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      try {
        const API_URL = getApiUrl();
        const resp = await fetch(
          `${API_URL}/notifications/unread-count?uid=${user.uid}`,
        );
        const data = await resp.json();
        if (data.ok) setUnreadCount(data.unread || 0);
      } catch (e) {
        console.error("Error cargando notificaciones", e);
      }
    };
    fetchUnread();
  }, [user]);

  const toggleNotifications = async () => {
    if (!user) return;
    const next = !notifOpen;
    setNotifOpen(next);
    if (next) {
      setLoadingNotifs(true);
      try {
        const API_URL = getApiUrl();
        const resp = await fetch(
          `${API_URL}/notifications?uid=${user.uid}`,
        );
        const data = await resp.json();
        if (data.ok) setNotifications(data.items || []);
      } catch (e) {
        console.error("Error cargando lista de notificaciones", e);
      } finally {
        setLoadingNotifs(false);
      }
    }
  };

  // global click handler
  useEffect(() => {
    (window as any).onVacancyClick = (vacancyId: string) => {
      window.location.href = `/dashboard/vacantes/${vacancyId}`;
    };
  }, []);

  // Auth
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((firebaseUser) => {
      if (!firebaseUser) {
        router.push("/login");
      } else {
        setUser(firebaseUser);
      }
      setLoadingUser(false);
    });
    return () => unsub();
  }, [router]);

  // Cargar perfil candidato
  useEffect(() => {
    if (!user) return;

    const fetchPerfil = async () => {
      setLoadingPerfil(true);
      try {
        const API_URL = getApiUrl();
        const resp = await fetch(
          `${API_URL}/candidates/perfil?uid=${user.uid}`,
        );
        const data: PerfilResponse = await resp.json();
        setPerfil(data);
      } catch (e) {
        console.error("Error cargando perfil", e);
        setPerfil({ ok: false, candidato: null, profileCompleted: false });
      } finally {
        setLoadingPerfil(false);
      }
    };

    fetchPerfil();
  }, [user]);

  // Geolocalización + guardar location en backend
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!navigator.geolocation) {
      setUbicacionError("Tu navegador no soporta geolocalización.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(coords);
        setUbicacionError(null);

        if (user) {
          try {
            const API_URL = getApiUrl();
            await fetch(`${API_URL}/candidates/location`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                uid: user.uid,
                latitude: coords.lat,
                longitude: coords.lng,
                radioKm: 10,
              }),
            });
          } catch (e) {
            console.error("Error guardando ubicación del candidato", e);
          }
        }
      },
      (error) => {
        console.error(error);
        setUbicacionError(
          "No se pudo obtener tu ubicación. Activa los permisos para ver empleos cercanos.",
        );
      },
    );
  }, [user]);

  // Category filtering state
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);

  // Matches backend (solo si perfil completo)
  useEffect(() => {
    const fetchMatches = async () => {
      if (!user || !perfil?.profileCompleted) return;
      setLoadingVacantes(true);
      try {
        const API_URL = getApiUrl();

        // Always use enhanced matching for better results
        const params = new URLSearchParams({
          enableDetailedMatching: 'true',
          radioKm: '15', // Slightly larger radius for map view
        });

        // Add category filtering if categories are selected
        if (selectedCategories.length > 0) {
          params.set('categoryIds', selectedCategories.join(','));
          params.set('includeHierarchical', 'true');
        }

        const url = `${API_URL}/match/candidate/${user.uid}?${params}`;
        const resp = await fetch(url);

        if (!resp.ok) {
          throw new Error(`HTTP error! status: ${resp.status}`);
        }

        const matchData = await resp.json();

        // Convert enhanced match results to map format
        const matchResults: MatchResult[] = Array.isArray(matchData)
          ? matchData
            .filter((match: any) => {
              // Filter out matches with invalid coordinates
              const lat = match.vacante?.lat;
              const lng = match.vacante?.lng;
              return lat && lng && !isNaN(lat) && !isNaN(lng);
            })
            .map((match: any) => ({
              vacante: {
                id: match.vacante.id,
                title: match.vacante.title,
                company: match.vacante.company,
                branchName: match.vacante.branchName,
                lat: match.vacante.lat,
                lng: match.vacante.lng,
              },
              score: match.score,
              color: match.color as MatchColor,
              percentage: match.percentage,
              // Include additional match info for tooltips
              matchFactors: match.matchFactors,
              categoryMatches: match.categoryMatches,
              matchReasons: match.matchReasons,
            }))
          : [];

        setVacantes(matchResults);
      } catch (e) {
        console.error("Error cargando matches:", e);
        // Fallback to empty array on error
        setVacantes([]);
      } finally {
        setLoadingVacantes(false);
      }
    };
    fetchMatches();
  }, [user, perfil?.profileCompleted, selectedCategories]);

  // Inicializar mapa (solo si perfil completo)
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !mapRef.current || mapInstance.current || loadingUser) return;
    if (!perfil || !perfil.profileCompleted) return;

    loadGoogleMaps(apiKey)
      .then((google: any) => {
        const center = userLocation || defaultCenter;
        mapInstance.current = new google.maps.Map(
          mapRef.current as HTMLDivElement,
          {
            center,
            zoom: 13,
            styles: routejobMapStyle,
          },
        );

        infoWindowRef.current = new google.maps.InfoWindow();
        setMapReady(true);
      })
      .catch((e) => {
        console.error("Error cargando Google Maps", e);
      });
  }, [loadingUser, userLocation, perfil]);

  // Marcador usuario
  useEffect(() => {
    if (!mapReady || !userLocation) return;
    const google = (window as any).google as any;
    if (!google || !mapInstance.current) return;

    if (!userMarkerRef.current) {
      userMarkerRef.current = new google.maps.Marker({
        position: userLocation,
        map: mapInstance.current,
        icon: {
          url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
          scaledSize: new google.maps.Size(40, 40),
        },
        label: {
          text: "Tú",
          color: "#FFFFFF",
          fontWeight: "700",
          fontSize: "12px",
        },
        zIndex: 9999,
        title: "Tu ubicación",
      });
    } else {
      userMarkerRef.current.setPosition(userLocation);
    }
  }, [mapReady, userLocation]);

  // Marcadores vacantes
  useEffect(() => {
    if (!mapReady) return;
    const google = (window as any).google as any;
    if (!google || !mapInstance.current) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    vacantes.forEach((m) => {
      const v = m.vacante;

      // Validate lat/lng values
      if (typeof v.lat !== 'number' || typeof v.lng !== 'number' ||
        isNaN(v.lat) || isNaN(v.lng) ||
        v.lat < -90 || v.lat > 90 || v.lng < -180 || v.lng > 180) {
        console.warn(`Invalid coordinates for vacancy ${v.id}: lat=${v.lat}, lng=${v.lng}`);
        return; // Skip this vacancy
      }

      const iconUrl =
        m.color === "green"
          ? "http://maps.google.com/mapfiles/ms/icons/green-dot.png"
          : m.color === "yellow"
            ? "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png"
            : "http://maps.google.com/mapfiles/ms/icons/red-dot.png";

      const marker = new google.maps.Marker({
        position: { lat: v.lat, lng: v.lng },
        map: mapInstance.current!,
        icon: {
          url: iconUrl,
          scaledSize: new google.maps.Size(32, 32),
        },
        label: {
          text: m.percentage,
          color: "#FFFFFF",
          fontWeight: "700",
          fontSize: "12px",
        },
        title: `${v.title} - ${v.company}`,
      });

      marker.addListener("click", () => {
        if (!infoWindowRef.current) return;
        const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${v.lat},${v.lng}`;

        // Build match breakdown if available
        const matchBreakdown = (m as any).matchFactors ? `
          <div style="margin:8px 0;padding:6px;background:#1F2937;border-radius:6px">
            <div style="font-size:10px;color:#9CA3AF;margin-bottom:4px">Match Breakdown:</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:10px">
              <div>📍 Location: ${Math.round((m as any).matchFactors.locationScore)}%</div>
              <div>🏷️ Category: ${Math.round((m as any).matchFactors.categoryScore)}%</div>
              <div>💼 Experience: ${Math.round((m as any).matchFactors.experienceScore)}%</div>
              <div>🛠️ Skills: ${Math.round((m as any).matchFactors.skillsScore)}%</div>
            </div>
          </div>
        ` : '';

        // Build match reasons if available
        const matchReasons = (m as any).matchReasons && (m as any).matchReasons.length > 0 ? `
          <div style="margin:6px 0">
            ${(m as any).matchReasons.map((reason: string) =>
          `<span style="display:inline-block;margin:2px 2px 0 0;padding:2px 6px;background:#1E40AF;color:#DBEAFE;border-radius:12px;font-size:9px">${reason}</span>`
        ).join('')}
          </div>
        ` : '';

        const content = `
<div style="font-size:13px; max-width:280px; font-family:Inter, sans-serif; color:#E5E7EB;">
  <p style="font-weight:600; color:#000000; margin:0 0 4px;">${v.title}</p>
  <p style="margin:0 0 8px; color:#000000; font-size:12px;">${v.company} · ${v.branchName}</p>
  
  <div style="display:flex; align-items:center; gap:8px; margin:8px 0;">
    <span style="
      padding:4px 10px;
      border-radius:9999px;
      background:${m.color === 'green' ? '#22C55E20' : m.color === 'yellow' ? '#EAB30820' : '#EF444420'
          };
      color:${m.color === 'green' ? '#22C55E' : m.color === 'yellow' ? '#EAB308' : '#EF4444'
          };
      font-size:11px;
      font-weight:700;
      text-transform:uppercase;
      letter-spacing:0.5px;
    ">
      ${m.score}% Match
    </span>
    <span style="font-size:11px; color:#9CA3AF;">
      ${m.color === 'green' ? 'Excellent' : m.color === 'yellow' ? 'Good' : 'Fair'} fit
    </span>
  </div>
  ${matchBreakdown}
  ${matchReasons}
  <div style="display:flex;gap:6px;margin-top:8px">
    <button
      onclick="window.onVacancyClick('${v.id}')"
      style="flex:1;padding:6px 8px;border-radius:9999px;border:none;background:#22C55E;color:#020617;font-size:11px;font-weight:700;cursor:pointer"
    >
      Ver detalle / Postular
    </button>
    <a
      href="${directionsUrl}"
      target="_blank"
      rel="noopener noreferrer"
      style="flex:1;text-align:center;padding:6px 8px;border-radius:9999px;border:1px solid #4B5563;background:#020617;color:#E5E7EB;font-size:11px;font-weight:600;text-decoration:none"
    >
      Cómo llegar
    </a>
  </div>
</div>
`;

        infoWindowRef.current.setContent(content);
        infoWindowRef.current.open({
          map: mapInstance.current!,
          anchor: marker,
        });
      });

      markersRef.current.push(marker);
    });
  }, [mapReady, vacantes]);

  const handleLogout = async () => {
    await auth.signOut();
    router.push("/");
  };

  const centrarEnMiUbicacion = () => {
    if (!mapInstance.current || !userLocation) return;
    mapInstance.current.setCenter(userLocation);
    mapInstance.current.setZoom(15);
  };

  if (loadingUser || loadingPerfil) {
    return (
      <main className="min-h-screen grid place-items-center bg-white text-zinc-700">
        Cargando perfil…
      </main>
    );
  }
  if (!user) return null;

  if (!perfil?.profileCompleted) {
    return (
      <main className="min-h-screen flex flex-col bg-white text-zinc-900">
        <section className="mx-auto max-w-3xl px-4 pt-24 pb-10 text-center">
          <h1 className="text-2xl font-bold mb-2">
            Completa tu perfil para ver vacantes en el mapa
          </h1>
          <p className="text-sm text-zinc-600 mb-4">
            Agrega tu experiencia, habilidades y ubicación para activar el mapa
            de empleos cercanos.
          </p>
          <button
            type="button"
            onClick={() => router.push("/dashboard/perfil")}
            className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400"
          >
            Ir a completar mi perfil
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col bg-white text-zinc-900 relative overflow-hidden selection:bg-emerald-100 selection:text-emerald-900">
      {/* Fondo patrón claro */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[16px_16px] mask-[radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-60" />
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-200/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-sky-200/40 rounded-full blur-3xl" />
      </div>

      {/* Unified Header */}
      <UnifiedHeader
        currentPage="smart-match"
        user={user}
        showSmartFeatures={true}
        onLogout={async () => {
          await auth.signOut();
        }}
      />

      {/* Contenido principal */}
      <section className="mx-auto max-w-6xl px-4 pt-24 pb-10 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 mb-1">
              Vacantes cerca de tu ubicación
            </h1>
            <p className="text-sm text-zinc-600">
              Explora el mapa, revisa el match y postula a los empleos que más te
              acomoden.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Smart Matching Indicator */}
            <div className="px-3 py-2 text-xs font-semibold rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 shadow-sm flex items-center gap-2">
              <span>🤖</span>
              <span>Smart Matching Activo</span>
              {vacantes.length > 0 && (
                <span className="px-2 py-1 bg-blue-200 text-blue-800 rounded-full text-xs">
                  {vacantes.length} matches
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowCategoryFilter(!showCategoryFilter)}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 shadow-sm"
            >
              {selectedCategories.length > 0 ? `${selectedCategories.length} categorías` : 'Filtrar por categoría'}
            </button>
            <button
              type="button"
              onClick={centrarEnMiUbicacion}
              disabled={!userLocation}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              Centrar en mi ubicación
            </button>
          </div>
        </div>

        {/* Category Filter */}
        {showCategoryFilter && (
          <div className="rounded-2xl border border-zinc-200 bg-white/95 backdrop-blur-xl p-4 shadow-lg shadow-zinc-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-zinc-900">
                Filtrar empleos por categoría
              </h3>
              <button
                type="button"
                onClick={() => setShowCategoryFilter(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <CategoryFilter
              selectedCategories={selectedCategories}
              onCategoriesChange={setSelectedCategories}
              placeholder="Buscar categorías de empleo..."
              maxSelections={3}
            />
            {selectedCategories.length > 0 && (
              <div className="mt-3 flex justify-between items-center">
                <p className="text-xs text-zinc-600">
                  Mostrando empleos de las categorías seleccionadas
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedCategories([])}
                  className="text-xs text-emerald-600 hover:text-emerald-700 underline"
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        )}

        {ubicacionError && (
          <p className="text-sm text-red-500">{ubicacionError}</p>
        )}

        <div className="rounded-2xl overflow-hidden border border-zinc-200 bg-white/70 backdrop-blur-xl shadow-lg shadow-zinc-100 relative">
          <div
            ref={mapRef}
            style={{ width: "100%", height: "480px" }}
          />

          {/* Match Legend */}
          {vacantes.length > 0 && (
            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-xl rounded-lg p-3 shadow-lg border border-zinc-200">
              <div className="text-xs font-semibold text-zinc-900 mb-2">Match Quality</div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-zinc-700">90%+ Excellent</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-zinc-700">70-89% Good</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-zinc-700">&lt;70% Fair</span>
                </div>
              </div>
              <div className="text-xs text-zinc-500 mt-2 pt-2 border-t border-zinc-200">
                Click markers for details
              </div>
            </div>
          )}
        </div>

        {loadingVacantes && (
          <p className="text-sm text-zinc-500 mt-2">
            🤖 Analizando matches personalizados…
          </p>
        )}

        {/* Match Summary */}
        {vacantes.length > 0 && !loadingVacantes && (
          <div className="mt-4 p-4 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl border border-emerald-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">
                  {vacantes.length} empleos encontrados con Smart Matching
                </h3>
                <p className="text-xs text-zinc-600">
                  Ordenados por compatibilidad con tu perfil
                </p>
              </div>
              <div className="flex gap-2 text-xs">
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full">
                  {vacantes.filter(v => v.color === 'green').length} excelentes
                </span>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                  {vacantes.filter(v => v.color === 'yellow').length} buenos
                </span>
                <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full">
                  {vacantes.filter(v => v.color === 'red').length} regulares
                </span>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
