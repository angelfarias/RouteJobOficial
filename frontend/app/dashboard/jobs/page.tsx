"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebaseClient";
import type { User } from "firebase/auth";
import Image from "next/image";
import CategoryFilter from "@/app/components/CategoryFilter";
import UnifiedHeader from "@/app/components/UnifiedHeader";
import { CategoryAPI, VacancyWithCategories } from "@/lib/categoryApi";

export default function JobsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [salaryMin, setSalaryMin] = useState<string>("");
  const [salaryMax, setSalaryMax] = useState<string>("");
  const [jornada, setJornada] = useState<string>("");
  const [tipoContrato, setTipoContrato] = useState<string>("");
  const [includeDescendants, setIncludeDescendants] = useState(true);
  
  // Results state
  const [vacancies, setVacancies] = useState<VacancyWithCategories[]>([]);
  const [matchResults, setMatchResults] = useState<any[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [searchLoading, setSearchLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'createdAt' | 'salary' | 'match'>('match');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [useEnhancedMatching, setUseEnhancedMatching] = useState(true);

  const router = useRouter();
  const resultsPerPage = 10;

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((firebaseUser) => {
      if (!firebaseUser) {
        router.push("/login");
      } else {
        setUser(firebaseUser);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  // Perform search when filters change
  useEffect(() => {
    if (!user) return;
    performSearch();
  }, [user, selectedCategories, salaryMin, salaryMax, jornada, tipoContrato, includeDescendants, currentPage, sortBy, sortOrder]);

  const performSearch = async () => {
    setSearchLoading(true);
    try {
      if (useEnhancedMatching && user) {
        // Use enhanced matching system
        const matchFilters: any = {
          enableDetailedMatching: true,
          minCategoryScore: 0,
        };

        if (selectedCategories.length > 0) {
          matchFilters.categoryIds = selectedCategories;
          matchFilters.includeHierarchical = includeDescendants;
        }

        const matches = await fetch(`http://localhost:3001/match/candidate/${user.uid}?${new URLSearchParams(matchFilters)}`);
        
        if (matches.ok) {
          const matchData = await matches.json();
          
          // Filter matches based on additional criteria
          let filteredMatches = matchData;
          
          if (salaryMin || salaryMax || jornada || tipoContrato) {
            // Get full vacancy details for filtering
            const vacancyIds = matchData.map((m: any) => m.vacante.id);
            const vacancyDetails = await Promise.all(
              vacancyIds.map(async (id: string) => {
                try {
                  const response = await fetch(`http://localhost:3001/vacancies/${id}`);
                  return response.ok ? await response.json() : null;
                } catch {
                  return null;
                }
              })
            );

            filteredMatches = matchData.filter((match: any, index: number) => {
              const vacancy = vacancyDetails[index];
              if (!vacancy) return false;

              if (salaryMin && vacancy.salaryMin && vacancy.salaryMin < parseInt(salaryMin)) return false;
              if (salaryMax && vacancy.salaryMax && vacancy.salaryMax > parseInt(salaryMax)) return false;
              if (jornada && vacancy.jornada !== jornada) return false;
              if (tipoContrato && vacancy.tipoContrato !== tipoContrato) return false;

              return true;
            });
          }

          // Sort by match score or other criteria
          if (sortBy === 'match') {
            filteredMatches.sort((a: any, b: any) => 
              sortOrder === 'desc' ? b.score - a.score : a.score - b.score
            );
          }

          setMatchResults(filteredMatches);
          setTotalResults(filteredMatches.length);
        } else {
          throw new Error('Failed to fetch matches');
        }
      } else {
        // Use traditional search
        const filters: any = {
          activeOnly: true,
          limit: resultsPerPage,
          offset: (currentPage - 1) * resultsPerPage,
          sortBy: sortBy === 'match' ? 'createdAt' : sortBy,
          sortOrder,
        };

        if (selectedCategories.length > 0) {
          filters.categoryIds = selectedCategories;
          filters.includeDescendants = includeDescendants;
        }

        if (salaryMin) filters.salaryMin = parseInt(salaryMin);
        if (salaryMax) filters.salaryMax = parseInt(salaryMax);
        if (jornada) filters.jornada = jornada;
        if (tipoContrato) filters.tipoContrato = tipoContrato;

        const result = await CategoryAPI.searchVacanciesAdvanced(filters);
        setVacancies(result.vacancies);
        setMatchResults([]);
        setTotalResults(result.total);
      }
    } catch (error) {
      console.error('Error searching vacancies:', error);
      setVacancies([]);
      setMatchResults([]);
      setTotalResults(0);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleTextSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    // For text search, we would need to implement a text search endpoint
    // For now, we'll just trigger the existing search
    setCurrentPage(1);
    performSearch();
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSalaryMin("");
    setSalaryMax("");
    setJornada("");
    setTipoContrato("");
    setCurrentPage(1);
  };

  const handleLogout = async () => {
    await auth.signOut();
    router.push("/");
  };

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return "Salario no especificado";
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
    if (min) return `Desde $${min.toLocaleString()}`;
    if (max) return `Hasta $${max.toLocaleString()}`;
    return "";
  };

  const totalPages = Math.ceil(totalResults / resultsPerPage);

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center bg-white text-zinc-700">
        Cargando...
      </main>
    );
  }
  if (!user) return null;

  return (
    <main className="min-h-screen flex flex-col bg-white text-zinc-900 relative overflow-hidden selection:bg-emerald-100 selection:text-emerald-900">
      {/* Background */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[16px_16px] mask-[radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-60" />
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-200/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-sky-200/40 rounded-full blur-3xl" />
      </div>

      {/* Unified Header */}
      <UnifiedHeader 
        currentPage="jobs" 
        user={user} 
        showSmartFeatures={true}
        onLogout={async () => {
          await auth.signOut();
        }}
      />

      {/* Content */}
      <section className="mx-auto max-w-7xl px-4 pt-24 pb-10 flex gap-6">
        {/* Filters Sidebar */}
        <aside className="w-80 space-y-6">
          <div className="rounded-2xl border border-zinc-200 bg-white/95 backdrop-blur-xl p-6 shadow-lg shadow-emerald-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-zinc-900">Filtros</h2>
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-zinc-500 hover:text-zinc-700 underline"
              >
                Limpiar filtros
              </button>
            </div>

            <div className="space-y-6">
              {/* Enhanced Matching Toggle */}
              <div className="p-4 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-lg border border-emerald-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900">Smart Matching</h3>
                    <p className="text-xs text-zinc-600">AI-powered job matching based on your profile</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useEnhancedMatching}
                      onChange={(e) => setUseEnhancedMatching(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
                {useEnhancedMatching && (
                  <div className="mt-2 text-xs text-emerald-700">
                    ✨ Jobs are ranked by compatibility with your profile
                  </div>
                )}
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-2">
                  Categorías
                </label>
                <CategoryFilter
                  selectedCategories={selectedCategories}
                  onCategoriesChange={setSelectedCategories}
                  placeholder="Buscar categorías..."
                  maxSelections={3}
                />
                {selectedCategories.length > 0 && (
                  <div className="mt-2">
                    <label className="flex items-center gap-2 text-xs text-zinc-600">
                      <input
                        type="checkbox"
                        checked={includeDescendants}
                        onChange={(e) => setIncludeDescendants(e.target.checked)}
                        className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      Incluir subcategorías
                    </label>
                  </div>
                )}
              </div>

              {/* Salary Range */}
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-2">
                  Rango salarial
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Mínimo"
                    value={salaryMin}
                    onChange={(e) => setSalaryMin(e.target.value)}
                    className="px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <input
                    type="number"
                    placeholder="Máximo"
                    value={salaryMax}
                    onChange={(e) => setSalaryMax(e.target.value)}
                    className="px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Work Schedule */}
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-2">
                  Jornada laboral
                </label>
                <select
                  value={jornada}
                  onChange={(e) => setJornada(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">Todas las jornadas</option>
                  <option value="full-time">Tiempo completo</option>
                  <option value="part-time">Medio tiempo</option>
                  <option value="flexible">Horario flexible</option>
                  <option value="remote">Remoto</option>
                </select>
              </div>

              {/* Contract Type */}
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-2">
                  Tipo de contrato
                </label>
                <select
                  value={tipoContrato}
                  onChange={(e) => setTipoContrato(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">Todos los contratos</option>
                  <option value="permanent">Indefinido</option>
                  <option value="temporary">Temporal</option>
                  <option value="contract">Por proyecto</option>
                  <option value="internship">Práctica</option>
                </select>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {/* Search Bar */}
          <div className="rounded-2xl border border-zinc-200 bg-white/95 backdrop-blur-xl p-6 shadow-lg shadow-emerald-100">
            <form onSubmit={handleTextSearch} className="flex gap-3">
              <div className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 flex items-center gap-3">
                <span className="text-zinc-500">
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
                  className="w-full bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 outline-none"
                  placeholder="Buscar por título, empresa o palabra clave..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="rounded-xl bg-zinc-900 px-6 py-2 text-sm font-semibold text-white shadow-md shadow-zinc-900/20 hover:bg-zinc-800 transition-colors"
              >
                Buscar
              </button>
            </form>
          </div>

          {/* Results Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">
                Empleos disponibles
              </h1>
              <p className="text-sm text-zinc-600">
                {searchLoading ? 'Buscando...' : `${totalResults} empleos encontrados`}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [newSortBy, newSortOrder] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder];
                  setSortBy(newSortBy);
                  setSortOrder(newSortOrder);
                }}
                className="px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {useEnhancedMatching && (
                  <>
                    <option value="match-desc">Mejor match</option>
                    <option value="match-asc">Menor match</option>
                  </>
                )}
                <option value="createdAt-desc">Más recientes</option>
                <option value="createdAt-asc">Más antiguos</option>
                <option value="salary-desc">Salario mayor</option>
                <option value="salary-asc">Salario menor</option>
              </select>
            </div>
          </div>

          {/* Active Filters Indicator */}
          {(selectedCategories.length > 0 || salaryMin || salaryMax || jornada || tipoContrato) && (
            <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-emerald-800">Filtros activos:</span>
                {selectedCategories.length > 0 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {selectedCategories.length} categoría{selectedCategories.length !== 1 ? 's' : ''}
                    {includeDescendants && ' (con subcategorías)'}
                  </span>
                )}
                {(salaryMin || salaryMax) && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                    Salario: {formatSalary(salaryMin ? parseInt(salaryMin) : undefined, salaryMax ? parseInt(salaryMax) : undefined)}
                  </span>
                )}
                {jornada && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                    {jornada === 'full-time' ? 'Tiempo completo' : 
                     jornada === 'part-time' ? 'Medio tiempo' : 
                     jornada === 'flexible' ? 'Horario flexible' : 
                     jornada === 'remote' ? 'Remoto' : jornada}
                  </span>
                )}
                {tipoContrato && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                    {tipoContrato === 'permanent' ? 'Indefinido' : 
                     tipoContrato === 'temporary' ? 'Temporal' : 
                     tipoContrato === 'contract' ? 'Por contrato' : 
                     tipoContrato === 'freelance' ? 'Freelance' : tipoContrato}
                  </span>
                )}
              </div>
              <button
                onClick={clearFilters}
                className="text-sm font-medium text-emerald-700 hover:text-emerald-800 transition-colors"
              >
                Limpiar filtros
              </button>
            </div>
          )}

          {/* Results */}
          <div className="space-y-4">
            {searchLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent mx-auto mb-4"></div>
                <p className="text-zinc-500">Buscando empleos...</p>
              </div>
            ) : (useEnhancedMatching && matchResults.length > 0) ? (
              matchResults.map((match) => (
                <div
                  key={match.vacante.id}
                  className="rounded-2xl border border-zinc-200 bg-white/95 backdrop-blur-xl p-6 shadow-lg shadow-zinc-100 hover:shadow-xl transition-shadow cursor-pointer"
                  onClick={() => router.push(`/dashboard/vacantes/${match.vacante.id}`)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-semibold text-zinc-900">
                          {match.vacante.title}
                        </h3>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          match.color === 'green' ? 'bg-green-100 text-green-800' :
                          match.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {match.score}% match
                        </div>
                      </div>
                      <p className="text-sm text-zinc-600">
                        {match.vacante.company} • {match.vacante.branchName}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${
                        match.color === 'green' ? 'text-green-600' :
                        match.color === 'yellow' ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {match.score}%
                      </div>
                      <div className="text-xs text-zinc-500">{match.percentage} match</div>
                    </div>
                  </div>

                  {/* Match breakdown */}
                  {match.matchFactors && (
                    <div className="mb-4">
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div className="text-center">
                          <div className="text-zinc-600">Location</div>
                          <div className="font-medium">{Math.round(match.matchFactors.locationScore)}%</div>
                        </div>
                        <div className="text-center">
                          <div className="text-zinc-600">Category</div>
                          <div className="font-medium">{Math.round(match.matchFactors.categoryScore)}%</div>
                        </div>
                        <div className="text-center">
                          <div className="text-zinc-600">Experience</div>
                          <div className="font-medium">{Math.round(match.matchFactors.experienceScore)}%</div>
                        </div>
                        <div className="text-center">
                          <div className="text-zinc-600">Skills</div>
                          <div className="font-medium">{Math.round(match.matchFactors.skillsScore)}%</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Match reasons */}
                  {match.matchReasons && match.matchReasons.length > 0 && (
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-2">
                        {match.matchReasons.map((reason: string, index: number) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Categories */}
                  {match.vacante.categories && match.vacante.categories.length > 0 && (
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-2">
                        {match.vacante.categories.map((category: any) => (
                          <span
                            key={category.id}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                          >
                            {category.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : vacancies.length > 0 ? (
              vacancies.map((vacancy) => (
                <div
                  key={vacancy.id}
                  className="rounded-2xl border border-zinc-200 bg-white/95 backdrop-blur-xl p-6 shadow-lg shadow-zinc-100 hover:shadow-xl transition-shadow cursor-pointer"
                  onClick={() => router.push(`/dashboard/vacantes/${vacancy.id}`)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-900 mb-1">
                        {vacancy.title}
                      </h3>
                      <p className="text-sm text-zinc-600">
                        {vacancy.company} • {vacancy.branchName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-600">
                        {formatSalary(vacancy.salaryMin, vacancy.salaryMax)}
                      </p>
                      {vacancy.jornada && (
                        <p className="text-xs text-zinc-500 capitalize">
                          {vacancy.jornada}
                        </p>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-zinc-700 mb-4 line-clamp-2">
                    {vacancy.description}
                  </p>

                  {/* Categories */}
                  {vacancy.categories && vacancy.categories.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {vacancy.categories.slice(0, 3).map((category) => (
                        <span
                          key={category.id}
                          className="inline-block bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full text-xs font-medium border border-emerald-200"
                        >
                          {category.name}
                        </span>
                      ))}
                      {vacancy.categories.length > 3 && (
                        <span className="inline-block bg-zinc-100 text-zinc-600 px-2 py-1 rounded-full text-xs">
                          +{vacancy.categories.length - 3} más
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <div className="flex items-center gap-4">
                      {vacancy.tipoContrato && (
                        <span className="capitalize">{vacancy.tipoContrato}</span>
                      )}
                      <span>
                        Publicado {new Date(vacancy.createdAt?.seconds * 1000 || Date.now()).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/vacantes/${vacancy.id}`);
                      }}
                      className="bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-emerald-400 transition-colors"
                    >
                      Ver detalles
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-lg font-semibold text-zinc-900 mb-2">
                  No se encontraron empleos
                </h3>
                <p className="text-zinc-600 mb-4">
                  {selectedCategories.length > 0 
                    ? `No hay empleos disponibles en las ${selectedCategories.length} categoría${selectedCategories.length !== 1 ? 's' : ''} seleccionada${selectedCategories.length !== 1 ? 's' : ''}. Intenta seleccionar otras categorías o ampliar tu búsqueda.`
                    : 'Intenta ajustar tus filtros o buscar con otros términos'
                  }
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-400 transition-colors"
                  >
                    Limpiar filtros
                  </button>
                  {selectedCategories.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedCategories([])}
                      className="bg-white border border-emerald-500 text-emerald-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-50 transition-colors"
                    >
                      Quitar filtros de categoría
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <button
                type="button"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-zinc-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-50"
              >
                Anterior
              </button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 rounded-lg text-sm ${
                      currentPage === page
                        ? 'bg-emerald-500 text-white'
                        : 'border border-zinc-200 hover:bg-zinc-50'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              
              <button
                type="button"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 border border-zinc-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-50"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}