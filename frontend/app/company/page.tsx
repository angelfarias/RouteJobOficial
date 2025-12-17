"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebaseClient";
import Image from "next/image";
import { getApiUrl } from "@/lib/env";
import { companySyncService } from "@/lib/services/companySynchronizationService";

type Company = {
  id?: string;
  name: string;
  description?: string;
  industry?: string;
  website?: string;
  phone?: string;
  email: string;
};

type Branch = {
  id: string;
  name: string;
  address: string;
  comuna?: string;
  ciudad?: string;
  latitude?: number;
  longitude?: number;
};

declare global {
  interface Window {
    google: any;
  }
}

function loadGoogleMaps(apiKey: string): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return;
    if (window.google && window.google.maps) {
      resolve(window.google);
      return;
    }
    const existing = document.getElementById("google-maps-script");
    if (existing) {
      existing.addEventListener("load", () => resolve(window.google));
      return;
    }
    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = (e) => reject(e);
    document.head.appendChild(script);
  });
}

export default function EmpresaPage() {
  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [company, setCompany] = useState<Company | null>(null);
  const [savingCompany, setSavingCompany] = useState(false);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [showBranchForm, setShowBranchForm] = useState(false);

  const [formEmpresa, setFormEmpresa] = useState<Company>({
    name: "",
    description: "",
    industry: "",
    website: "",
    phone: "",
    email: "",
  });

  const [formSucursal, setFormSucursal] = useState({
    name: "",
    address: "",
    comuna: "",
    ciudad: "",
    latitude: "",
    longitude: "",
  });

  const router = useRouter();

  // refs para mapa sucursal
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<any | null>(null);
  const markerRef = useRef<any | null>(null);

  // Auth
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) {
        router.push("/login");
      } else {
        try {
          // Ensure company profile exists in Firestore
          await companySyncService.syncCompanyOnLogin(firebaseUser);
          setUser(firebaseUser);
        } catch (error) {
          console.error('Error syncing company profile:', error);
          setUser(firebaseUser); // Continue even if sync fails
        }
      }
      setLoadingUser(false);
    });
    return () => unsub();
  }, [router]);

  // Cargar empresa + sucursales
  useEffect(() => {
    if (!user) return;

    const fetchBranches = async (companyId: string) => {
      setLoadingBranches(true);
      try {
        const API_URL = getApiUrl();
        const resp = await fetch(`${API_URL}/branches/company/${companyId}`);

        if (!resp.ok) {
          console.error("Error HTTP branches", resp.status, resp.statusText);
          setBranches([]);
          return;
        }

        const text = await resp.text();
        if (!text) {
          setBranches([]);
          return;
        }

        let json: any = null;
        try {
          json = JSON.parse(text);
        } catch (e) {
          console.error("Error parseando JSON de branches", e, text);
        }
        setBranches(Array.isArray(json) ? json : []);
      } catch (e) {
        console.error("Error cargando sucursales", e);
        setBranches([]);
      } finally {
        setLoadingBranches(false);
      }
    };

    const fetchCompany = async () => {
      try {
        // Load company profile from Firestore
        const companyProfile = await companySyncService.getCompanyProfile(user.uid);
        
        if (companyProfile) {
          const companyData = {
            id: user.uid,
            name: companyProfile.name || "",
            description: companyProfile.description || "",
            industry: companyProfile.industry || "",
            website: companyProfile.website || "",
            phone: companyProfile.phone || "",
            email: companyProfile.email || user.email,
          };
          
          setCompany(companyData);
          setFormEmpresa(companyData);
          
          // Load branches
          fetchBranches(user.uid);
        } else {
          // No company profile found, set default form
          setFormEmpresa((prev) => ({ ...prev, email: user.email }));
        }
      } catch (e) {
        console.error("Error loading company from Firestore:", e);
        // Fallback: try to load from backend API
        try {
          const API_URL = getApiUrl();
          const resp = await fetch(`${API_URL}/companies/me`, {
            headers: {
              "x-user-uid": user.uid,
            },
          });

          if (resp.ok) {
            const data = await resp.json();
            if (data) {
              setCompany(data);
              setFormEmpresa({
                name: data.name || "",
                description: data.description || "",
                industry: data.industry || "",
                website: data.website || "",
                phone: data.phone || "",
                email: data.email || user.email,
              });
              if (data.id) {
                fetchBranches(data.id);
              }
            }
          } else {
            setFormEmpresa((prev) => ({ ...prev, email: user.email }));
          }
        } catch (backendError) {
          console.error("Error loading from backend:", backendError);
          setFormEmpresa((prev) => ({ ...prev, email: user.email }));
        }
      }
    };

    fetchCompany();
  }, [user]);

  // Inicializar mapa y geocoding inverso al abrir formulario
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;
    if (!showBranchForm) return;
    if (!mapRef.current) return;
    if (mapInstance.current) return;

    loadGoogleMaps(apiKey)
      .then((google) => {
        const center = {
          lat: formSucursal.latitude
            ? Number(formSucursal.latitude)
            : -33.4489,
          lng: formSucursal.longitude
            ? Number(formSucursal.longitude)
            : -70.6693,
        };

        const geocoder = new google.maps.Geocoder(); // reverse geocode[web:48][web:60]

        mapInstance.current = new google.maps.Map(
          mapRef.current as HTMLDivElement,
          {
            center,
            zoom: 15,
          },
        );

        markerRef.current = new google.maps.Marker({
          position: center,
          map: mapInstance.current,
          draggable: true,
        });

        const updateAddressFromLatLng = (lat: number, lng: number) => {
          geocoder
            .geocode({ location: { lat, lng } })
            .then((res: any) => {
              const result = res.results?.[0];
              if (!result) return;

              const comps = result.address_components as any[];

              const getComp = (type: string) =>
                comps.find((c: any) => c.types.includes(type))?.long_name || "";

              const street = getComp("route");
              const number = getComp("street_number");
              const comunaRaw =
                getComp("administrative_area_level_3") ||
                getComp("administrative_area_level_2") ||
                getComp("sublocality") ||
                getComp("locality");
              const localidad = getComp("locality");
              const region = getComp("administrative_area_level_1"); // Región Metropolitana, etc.[web:79]

              let comuna = comunaRaw;
              let ciudad = localidad;

              // Si ciudad y comuna son iguales, usa la región como ciudad o déjala vacía
              if (ciudad && comuna && ciudad === comuna) {
                ciudad = region || "";
              }

              setFormSucursal((prev) => ({
                ...prev,
                address:
                  (street || number
                    ? `${street || ""} ${number || ""}`.trim()
                    : result.formatted_address) || prev.address,
                comuna: comuna || prev.comuna,
                ciudad: ciudad || prev.ciudad,
                latitude: String(lat),
                longitude: String(lng),
              }));
            })
            .catch((e: any) => {
              console.error("Error reverse geocoding", e);
            });
        };

        google.maps.event.addListener(markerRef.current, "dragend", () => {
          const pos = markerRef.current.getPosition();
          const lat = pos.lat();
          const lng = pos.lng();
          updateAddressFromLatLng(lat, lng);
        });

        // llamada inicial
        updateAddressFromLatLng(center.lat, center.lng);
      })
      .catch((e) => {
        console.error("Error cargando Google Maps", e);
      });
  }, [showBranchForm, formSucursal.latitude, formSucursal.longitude]);

  // limpiar mapa al cerrar formulario
  useEffect(() => {
    if (!showBranchForm && mapInstance.current) {
      mapInstance.current = null;
      markerRef.current = null;
    }
  }, [showBranchForm]);

  if (loadingUser) {
    return (
      <main className="min-h-screen grid place-items-center bg-white text-zinc-700">
        Cargando…
      </main>
    );
  }
  if (!user) return null;

  const handleChangeEmpresa = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormEmpresa((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCompany(true);
    try {
      // Update company profile in Firestore
      const updatedProfile = await companySyncService.updateCompanyProfile(user.uid, {
        name: formEmpresa.name,
        description: formEmpresa.description,
        industry: formEmpresa.industry,
        website: formEmpresa.website,
        phone: formEmpresa.phone,
        email: formEmpresa.email,
        profileCompleted: true
      });

      // Update local state
      setCompany({
        id: user.uid,
        name: updatedProfile.name || '',
        description: updatedProfile.description || '',
        industry: updatedProfile.industry || '',
        website: updatedProfile.website || '',
        phone: updatedProfile.phone || '',
        email: updatedProfile.email
      });

      // Also try to sync with backend (optional, for compatibility)
      try {
        const API_URL = getApiUrl();
        const backendData = {
          ...formEmpresa,
          id: user.uid
        };
        
        await fetch(`${API_URL}/companies`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-uid": user.uid,
          },
          body: JSON.stringify(backendData),
        });
      } catch (backendError) {
        console.warn('Backend sync failed, but Firestore update succeeded:', backendError);
      }

      // Load branches if company exists
      if (user.uid) {
        try {
          const API_URL = getApiUrl();
          const branchesResp = await fetch(`${API_URL}/branches/company/${user.uid}`);
          if (branchesResp.ok) {
            const branchesData = await branchesResp.json();
            setBranches(Array.isArray(branchesData) ? branchesData : []);
          }
        } catch (branchError) {
          console.warn('Failed to load branches:', branchError);
          setBranches([]);
        }
      }
    } catch (error) {
      console.error('Error saving company:', error);
      alert('Error al guardar la empresa. Intenta de nuevo.');
    } finally {
      setSavingCompany(false);
    }
  };

  const handleChangeSucursal = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormSucursal((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveSucursal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company?.id) return;
    const API_URL = getApiUrl();
    const resp = await fetch(`${API_URL}/branches/${company.id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-uid": user.uid,
      },
      body: JSON.stringify({
        ...formSucursal,
        latitude: Number(formSucursal.latitude),
        longitude: Number(formSucursal.longitude),
      }),
    });
    const data = await resp.json();
    setBranches((prev) => [...prev, data]);
    setShowBranchForm(false);
    setFormSucursal({
      name: "",
      address: "",
      comuna: "",
      ciudad: "",
      latitude: "",
      longitude: "",
    });
    mapInstance.current = null;
    markerRef.current = null;
  };

  const handleLogout = async () => {
    await auth.signOut();
    router.push("/login");
  };

  return (
    <main className="min-h-screen flex flex-col bg-white text-zinc-900 relative overflow-hidden selection:bg-emerald-100 selection:text-emerald-900">
      {/* Fondo */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[16px_16px] mask-[radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-60" />
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-200/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-sky-200/40 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white/80 backdrop-blur-xl border-b border-zinc-200/60 shadow-sm">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2"
          >
            <div className="relative w-32 h-10">
              <Image
                src="/logo.png"
                alt="RouteJob Empresas"
                fill
                className="object-contain object-left"
                priority
              />
            </div>
          </button>

          <nav className="flex items-center gap-4 text-xs sm:text-[13px]">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="text-zinc-600 hover:text-zinc-900"
            >
              Modo candidato
            </button>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 font-semibold border border-emerald-200">
              Cuenta empresa
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="text-zinc-500 hover:text-zinc-900"
            >
              Cerrar sesión
            </button>
          </nav>
        </div>
      </header>

      {/* Contenido */}
      <section className="mx-auto max-w-6xl px-4 pt-24 pb-10 flex flex-col md:flex-row gap-6">
        {/* Columna empresa */}
        <div className="w-full md:w-2/3 space-y-6">
          {/* Empresa */}
          <div className="rounded-2xl border border-zinc-200 bg-white/95 backdrop-blur-xl p-6 shadow-lg shadow-emerald-100">
            <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-900 mb-1">
              Panel empresa
            </h1>
            <p className="text-xs sm:text-sm text-zinc-600 mb-4">
              Crea y administra el perfil de tu empresa. Luego agrega sucursales
              y publica vacantes que se verán en el mapa de candidatos.
            </p>

            <form
              onSubmit={handleSaveEmpresa}
              className="space-y-4 text-sm"
            >
              <div>
                <label className="block mb-1 text-xs font-medium text-zinc-600">
                  Nombre de la empresa
                </label>
                <input
                  name="name"
                  value={formEmpresa.name}
                  onChange={handleChangeEmpresa}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block mb-1 text-xs font-medium text-zinc-600">
                  Descripción
                </label>
                <textarea
                  name="description"
                  value={formEmpresa.description}
                  onChange={handleChangeEmpresa}
                  rows={3}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none resize-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-xs font-medium text-zinc-600">
                    Rubro / industria
                  </label>
                  <input
                    name="industry"
                    value={formEmpresa.industry}
                    onChange={handleChangeEmpresa}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-xs font-medium text-zinc-600">
                    Sitio web
                  </label>
                  <input
                    name="website"
                    value={formEmpresa.website}
                    onChange={handleChangeEmpresa}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-xs font-medium text-zinc-600">
                    Teléfono de contacto
                  </label>
                  <input
                    name="phone"
                    value={formEmpresa.phone}
                    onChange={handleChangeEmpresa}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-xs font-medium text-zinc-600">
                    Email de contacto
                  </label>
                  <input
                    name="email"
                    type="email"
                    value={formEmpresa.email}
                    onChange={handleChangeEmpresa}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingCompany}
                className="mt-2 inline-flex items-center justify-center rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-zinc-900/20 hover:bg-zinc-800 disabled:opacity-60"
              >
                {company?.id ? "Guardar cambios" : "Crear empresa"}
              </button>
            </form>
          </div>

          {/* Sucursales */}
          {company?.id && (
            <div className="rounded-2xl border border-zinc-200 bg-white/95 backdrop-blur-xl p-5 shadow-lg shadow-zinc-100">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-zinc-900">
                  Sucursales de {company.name}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowBranchForm((v) => !v);
                    if (!showBranchForm) {
                      setFormSucursal((prev) => ({
                        ...prev,
                        latitude: prev.latitude || "-33.4489",
                        longitude: prev.longitude || "-70.6693",
                      }));
                    }
                  }}
                  className="rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-400"
                >
                  {showBranchForm ? "Cancelar" : "Agregar sucursal"}
                </button>
              </div>

              {showBranchForm && (
                <form
                  onSubmit={handleSaveSucursal}
                  className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs"
                >
                  <input
                    name="name"
                    placeholder="Nombre sucursal"
                    value={formSucursal.name}
                    onChange={handleChangeSucursal}
                    className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    required
                  />
                  <input
                    name="address"
                    placeholder="Dirección"
                    value={formSucursal.address}
                    onChange={handleChangeSucursal}
                    className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    required
                  />
                  <input
                    name="comuna"
                    placeholder="Comuna"
                    value={formSucursal.comuna}
                    onChange={handleChangeSucursal}
                    className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <input
                    name="ciudad"
                    placeholder="Ciudad"
                    value={formSucursal.ciudad}
                    onChange={handleChangeSucursal}
                    className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />

                  <div className="md:col-span-2">
                    <p className="mb-1 text-[11px] text-zinc-600">
                      Mueve el pin para ajustar la ubicación exacta de la sucursal.
                    </p>
                    <div
                      ref={mapRef}
                      style={{ width: "100%", height: "260px" }}
                      className="rounded-xl overflow-hidden bg-zinc-100"
                    />
                  </div>

                  <input
                    type="hidden"
                    name="latitude"
                    value={formSucursal.latitude}
                  />
                  <input
                    type="hidden"
                    name="longitude"
                    value={formSucursal.longitude}
                  />

                  <button
                    type="submit"
                    className="md:col-span-2 mt-1 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-400"
                  >
                    Guardar sucursal
                  </button>
                </form>
              )}

              {loadingBranches && (
                <p className="text-xs text-zinc-500">Cargando sucursales…</p>
              )}

              {!loadingBranches && branches.length === 0 && (
                <p className="text-xs text-zinc-500">
                  Aún no tienes sucursales. Crea la primera para publicar vacantes.
                </p>
              )}

              <ul className="space-y-2 text-xs">
                {branches.map((b) => (
                  <li
                    key={b.id}
                    className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 flex justify-between gap-3"
                  >
                    <div>
                      <p className="font-semibold text-zinc-900">{b.name}</p>
                      <p className="text-zinc-600">{b.address}</p>
                      <p className="text-zinc-500">
                        {b.comuna} {b.ciudad && `· ${b.ciudad}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/company/branch/${b.id}/vacancies`)
                      }
                      className="self-center rounded-lg bg-zinc-900 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm shadow-zinc-900/20 hover:bg-zinc-800"
                    >
                      Ver / crear vacantes
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Columna derecha */}
        <aside className="w-full md:w-1/3 space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 shadow-sm">
            <p className="mb-2 text-sm font-semibold text-emerald-900">
              Cómo funciona para empresas
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Crea el perfil de tu empresa.</li>
              <li>Agrega sucursales con su ubicación exacta.</li>
              <li>Publica vacantes por sucursal y aparecerán en el mapa.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white/95 backdrop-blur-xl p-4 text-xs text-zinc-600 shadow-sm">
            <p className="mb-2 text-sm font-semibold text-zinc-900">
              Consejo de visibilidad
            </p>
            <p>
              Usa descripciones claras y completas en tus vacantes para mejorar
              el match con los candidatos ideales.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
