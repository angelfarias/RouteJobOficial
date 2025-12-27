"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebaseClient";
import type { User } from "firebase/auth";
import Image from "next/image";
import UnifiedHeader from "@/app/components/UnifiedHeader";
import ErrorBoundary from "@/app/components/ErrorBoundary";
import { UserProfileService, ProfileUpdateData } from "@/lib/services/userProfileService";
import { DashboardDataService, DashboardData } from "@/lib/services/dashboardDataService";
import { LoadingState, ErrorState, NoJobsEmptyState, NoApplicationsEmptyState, NoMessagesEmptyState } from "@/app/components/EmptyStates";
import { Sparkles, MapPin } from "lucide-react";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    profile: null,
    activity: { applications: 0, messages: 0, profileViews: 0 },
    recentJobs: [],
    loading: true,
    error: null
  });
  const [busqueda, setBusqueda] = useState("");

  const router = useRouter();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) {
        router.push("/login");
      } else {
        setUser(firebaseUser);
        // Load dashboard data
        try {
          const data = await DashboardDataService.getDashboardData(firebaseUser);
          setDashboardData(data);
        } catch (error) {
          console.error('Error loading dashboard data:', error);
          setDashboardData(prev => ({
            ...prev,
            loading: false,
            error: 'Error al cargar los datos del dashboard'
          }));
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300">
        Cargando...
      </main>
    );
  }
  if (!user) return null;

  const handleLogout = async () => {
    await auth.signOut();
    router.push("/");
  };

  const handleProfileUpdate = async (data: ProfileUpdateData) => {
    if (!user) return;

    try {
      await UserProfileService.updateProfile(user, data);
      // Refresh user data
      await user.reload();
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const handleAccountDelete = async () => {
    if (!user) return;

    try {
      await UserProfileService.deleteAccount(user);
      router.push("/");
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  };

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/dashboard/jobs?search=${encodeURIComponent(busqueda)}`);
  };

  const refreshDashboardData = async () => {
    if (!user) return;

    setDashboardData(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await DashboardDataService.getDashboardData(user);
      setDashboardData(data);
    } catch (error) {
      console.error('Error refreshing dashboard data:', error);
      setDashboardData(prev => ({
        ...prev,
        loading: false,
        error: 'Error al actualizar los datos'
      }));
    }
  };

  return (
    <main className="min-h-screen flex flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 relative overflow-hidden selection:bg-emerald-100 selection:text-emerald-900">
      {/* BACKGROUND PATRÓN CLARO */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[16px_16px] mask-[radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-60" />
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-200/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-sky-200/40 rounded-full blur-3xl" />
      </div>

      {/* Unified Header */}
      <UnifiedHeader
        currentPage="dashboard"
        user={user}
        showSmartFeatures={true}
        onLogout={handleLogout}
        onProfileUpdate={handleProfileUpdate}
        onAccountDelete={handleAccountDelete}
      />

      {/* CONTENIDO */}
      <section className="mx-auto flex max-w-7xl gap-6 px-4 pt-24 pb-10">
        {/* COLUMNA IZQUIERDA */}
        <aside className="w-full max-w-xs rounded-2xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl p-5 shadow-lg shadow-emerald-100 dark:shadow-emerald-900/10 border border-zinc-200 dark:border-zinc-800">
          <ErrorBoundary>
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-sky-400 text-xl font-bold text-white shadow-md shadow-emerald-200">
                {(user?.displayName || user?.email || "?")[0]?.toUpperCase()}
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold">
                  {dashboardData.profile?.displayName || user?.displayName || "Candidato RouteJob"}
                </p>
                <p className="text-[11px] text-emerald-600 mt-1">
                  {dashboardData.profile ?
                    DashboardDataService.getProfileCompletenessMessage(dashboardData.profile.profileCompleteness) :
                    "Perfil en construcción · mejora tu match"
                  }
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push("/dashboard/perfil/smart")}
                className="mt-2 w-full rounded-xl border border-purple-300 dark:border-purple-700 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 px-3 py-2 text-xs font-semibold text-purple-700 dark:text-purple-300 hover:from-purple-100 hover:to-blue-100 dark:hover:from-purple-900/30 dark:hover:to-blue-900/30 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-3 h-3" />
                Ver Smart CV
              </button>
            </div>

            <div className="mt-6 space-y-4 text-[11px] text-zinc-600">
              <div>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Última actualización del perfil
                </p>
                <p className="text-zinc-500">
                  {DashboardDataService.formatLastUpdated(dashboardData.profile?.lastUpdated)}
                </p>
              </div>

              <div>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Disponibilidad para nuevas oportunidades
                </p>
                <p className="mt-1 text-zinc-500 dark:text-zinc-400">
                  {dashboardData.profile?.isAvailableForOpportunities
                    ? `Escucho propuestas de empleo${dashboardData.profile.location ? ` cerca de ${dashboardData.profile.location}` : ''}.`
                    : "No estoy buscando nuevas oportunidades en este momento."
                  }
                </p>
                <div className="mt-2 flex items-center gap-2">
                  {dashboardData.profile?.isAvailableForOpportunities ? (
                    <>
                      <span className="relative inline-flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
                      </span>
                      <span className="text-emerald-600 text-[11px]">
                        Activo para nuevas oportunidades
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-zinc-400" />
                      <span className="text-zinc-500 text-[11px]">
                        No disponible actualmente
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </ErrorBoundary>
        </aside>

        {/* COLUMNA CENTRAL */}
        <div className="flex-1 space-y-6">
          {/* Hero búsqueda */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl p-6 shadow-lg shadow-emerald-100 dark:shadow-emerald-900/10">
            <h1 className="mb-2 text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">
              ¡Hola, {user.displayName || "candidato"}!{" "}
              <span className="text-emerald-600">
                Tu próximo empleo está cerca.
              </span>
            </h1>
            <p className="mb-4 text-xs text-zinc-600 dark:text-zinc-400">
              Usa el buscador o el mapa para encontrar vacantes reales cerca de
              ti, sin estafas ni procesos eternos.
            </p>

            <form
              onSubmit={handleBuscar}
              className="flex flex-col gap-3 md:flex-row"
            >
              <div className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-2 flex items-center gap-3">
                <span className="text-zinc-500 dark:text-zinc-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-4.35-4.35M11 5a6 6 0 100 12 6 6 0 000-12z"
                    />
                  </svg>
                </span>
                <input
                  type="text"
                  className="w-full bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none"
                  placeholder="Puesto, empresa o palabra clave"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>

              <button
                type="button"
                onClick={() => router.push("/dashboard/mapa")}
                className="rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
              >
                Usar mi ubicación
              </button>

              <button
                type="button"
                onClick={() => router.push("/dashboard/jobs")}
                className="rounded-xl bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-sm font-semibold text-white dark:text-zinc-900 shadow-md shadow-zinc-900/20 hover:bg-zinc-800 dark:hover:bg-zinc-200 hover:translate-y-[1px] transition-transform"
              >
                Buscar con filtros
              </button>
            </form>
          </div>

          {/* Bloque “mejora tu perfil” */}
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/10 p-4 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between gap-4 shadow-sm">
            <div>
              <p className="font-semibold text-emerald-900 dark:text-emerald-100">
                Consejo RouteJob: mantén tu perfil al día
              </p>
              <p>
                Actualiza tu experiencia, estudios y comuna para que el sistema
                pueda recomendarte mejores vacantes.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/dashboard/perfil")}
              className="rounded-xl bg-emerald-500 px-3 py-2 text-[11px] font-semibold text-white hover:bg-emerald-400 transition-colors"
            >
              Mejorar mi perfil
            </button>
          </div>

          {/* Smart Profile Setup */}
          <div className="rounded-2xl border border-purple-200 dark:border-purple-800 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/10 dark:to-blue-900/10 p-4 text-xs text-purple-800 dark:text-purple-300 flex items-center justify-between gap-4 shadow-sm">
            <div>
              <p className="font-semibold text-purple-900 dark:text-purple-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Smart CV Assistant
              </p>
              <p>
                Crea un CV inteligente con preguntas precisas. Responde solo lo que se pregunta
                para obtener mejores matches basados en análisis de IA.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/dashboard/perfil/smart")}
              className="rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 px-3 py-2 text-[11px] font-semibold text-white hover:from-purple-600 hover:to-blue-600 transition-all flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              Crear Smart CV
            </button>
          </div>

          {/* Smart Matching Setup */}
          <div className="rounded-2xl border border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 p-4 text-xs text-blue-800 dark:text-blue-300 flex items-center justify-between gap-4 shadow-sm">
            <div>
              <p className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Smart Match con IA
              </p>
              <p>
                Encuentra empleos personalizados en el mapa basados en tu Smart CV,
                ubicación, experiencia y preferencias inteligentes.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/dashboard/mapa")}
              className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 px-3 py-2 text-[11px] font-semibold text-white hover:from-blue-600 hover:to-purple-600 transition-all flex items-center gap-1"
            >
              <MapPin className="w-3 h-3" />
              Ver Smart Match
            </button>
          </div>

          {/* Lista vacantes */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl shadow-lg shadow-zinc-100 dark:shadow-zinc-900/20">
            <div className="flex border-b border-zinc-200 dark:border-zinc-800 text-sm">
              <button className="flex-1 px-4 py-3 text-center font-semibold text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-500 dark:border-emerald-400">
                Empleos
              </button>
              <button className="flex-1 px-4 py-3 text-center text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors">
                Empresas
              </button>
            </div>

            <ErrorBoundary>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {dashboardData.loading ? (
                  <LoadingState message="Cargando empleos..." />
                ) : dashboardData.error ? (
                  <ErrorState message={dashboardData.error} onRetry={refreshDashboardData} />
                ) : dashboardData.recentJobs.length === 0 ? (
                  <NoJobsEmptyState onSearchJobs={() => router.push('/dashboard/jobs')} />
                ) : (
                  dashboardData.recentJobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="text-[11px] text-zinc-500">
                          Publicado hace {job.publishedDays} día{job.publishedDays !== 1 ? 's' : ''}
                        </p>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {job.title}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          {job.company} · {job.location} · {job.type}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          Match {job.matchPercentage}%
                        </span>
                        <button
                          onClick={() => router.push(`/dashboard/jobs/${job.id}`)}
                          className="rounded-lg bg-zinc-900 dark:bg-zinc-100 px-3 py-2 text-[11px] font-semibold text-white dark:text-zinc-900 shadow-sm shadow-zinc-900/20 hover:bg-zinc-800 dark:hover:bg-zinc-200"
                        >
                          Ver detalles
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ErrorBoundary>
          </div>
        </div>

        {/* COLUMNA DERECHA */}
        <aside className="hidden w-72 flex-col gap-4 lg:flex">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl p-4 text-[11px] text-zinc-600 dark:text-zinc-400 shadow-md shadow-zinc-100 dark:shadow-zinc-900/10">
            <p className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Mi actividad
            </p>
            <ErrorBoundary>
              {dashboardData.loading ? (
                <LoadingState message="Cargando actividad..." />
              ) : dashboardData.error ? (
                <ErrorState message={dashboardData.error} onRetry={refreshDashboardData} />
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Postulaciones</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {dashboardData.activity.applications}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Mensajes</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {dashboardData.activity.messages}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Vistas del perfil</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {dashboardData.activity.profileViews}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Alertas de empleo</span>
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      Próximamente
                    </span>
                  </div>
                </div>
              )}
            </ErrorBoundary>
          </div>

          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/10 p-4 text-[11px] text-emerald-800 dark:text-emerald-300 shadow-sm">
            <p className="mb-2 text-sm font-semibold text-emerald-900 dark:text-emerald-100">
              Salario estimado
            </p>
            <p>
              Cuando te postules a vacantes, verás un rango salarial comparado
              con otros perfiles similares de RouteJob.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
