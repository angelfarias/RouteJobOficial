"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import CategoryFilter from "@/app/components/CategoryFilter";
import { CategoryAPI, Category, CategoryNode, VacancyWithCategories } from "@/lib/categoryApi";

export default function CategoriesDemoPage() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryTree, setCategoryTree] = useState<CategoryNode[]>([]);
  const [popularCategories, setPopularCategories] = useState<Category[]>([]);
  const [searchResults, setSearchResults] = useState<VacancyWithCategories[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const router = useRouter();

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [tree, popular] = await Promise.all([
          CategoryAPI.getCategoryTree(),
          CategoryAPI.getPopularCategories(10)
        ]);
        setCategoryTree(tree);
        setPopularCategories(popular);
      } catch (error) {
        console.error('Error loading category data:', error);
      }
    };
    loadData();
  }, []);

  // Search when categories change
  useEffect(() => {
    if (selectedCategories.length > 0) {
      searchByCategories();
    } else {
      setSearchResults([]);
    }
  }, [selectedCategories]);

  const searchByCategories = async () => {
    if (selectedCategories.length === 0) return;
    
    setLoading(true);
    try {
      const result = await CategoryAPI.searchVacanciesByCategories(selectedCategories, {
        includeDescendants: true,
        limit: 20
      });
      setSearchResults(result.vacancies);
    } catch (error) {
      console.error('Error searching by categories:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const renderCategoryNode = (node: CategoryNode, depth = 0) => {
    return (
      <div key={node.category.id} className={`${depth > 0 ? 'ml-4' : ''} mb-2`}>
        <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-zinc-200 shadow-sm">
          <div>
            <h4 className="font-medium text-zinc-900">{node.category.name}</h4>
            {node.category.description && (
              <p className="text-sm text-zinc-600">{node.category.description}</p>
            )}
            <p className="text-xs text-zinc-500">
              Nivel {node.category.level} • {node.category.path.join(' > ')}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-emerald-600">
              {node.vacancyCount} empleos
            </div>
            <div className="text-xs text-zinc-500">
              {node.category.totalVacancyCount} total
            </div>
          </div>
        </div>
        {node.children.map(child => renderCategoryNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <main className="min-h-screen flex flex-col bg-white text-zinc-900 relative overflow-hidden">
      {/* Background */}
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
                alt="RouteJob"
                fill
                className="object-contain object-left"
                priority
              />
            </div>
          </button>

          <nav className="flex items-center gap-4 text-sm">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="text-zinc-600 hover:text-zinc-900"
            >
              ← Volver al dashboard
            </button>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 font-semibold border border-emerald-200">
              Demo Categorías
            </span>
          </nav>
        </div>
      </header>

      {/* Content */}
      <section className="mx-auto max-w-7xl px-4 pt-24 pb-10 space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-zinc-900 mb-2">
            🎯 Sistema de Categorías RouteJob
          </h1>
          <p className="text-lg text-zinc-600 max-w-3xl mx-auto">
            Explora cómo funciona nuestro sistema de categorías jerárquicas para empleos. 
            Filtra, busca y encuentra trabajos organizados por categorías y subcategorías.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Category Filter Demo */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-zinc-200 bg-white/95 backdrop-blur-xl p-6 shadow-lg shadow-emerald-100 sticky top-24">
              <h2 className="text-xl font-semibold text-zinc-900 mb-4">
                🔍 Filtro de Categorías
              </h2>
              <p className="text-sm text-zinc-600 mb-4">
                Selecciona hasta 3 categorías para filtrar empleos. El sistema incluye 
                automáticamente subcategorías para resultados más completos.
              </p>
              
              <CategoryFilter
                selectedCategories={selectedCategories}
                onCategoriesChange={setSelectedCategories}
                placeholder="Buscar categorías..."
                maxSelections={3}
                showPopular={true}
              />

              {selectedCategories.length > 0 && (
                <div className="mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <p className="text-sm font-medium text-emerald-800 mb-2">
                    Filtros activos:
                  </p>
                  <p className="text-xs text-emerald-700">
                    Buscando empleos en {selectedCategories.length} categoría(s) seleccionada(s), 
                    incluyendo todas las subcategorías.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Results and Tree */}
          <div className="lg:col-span-2 space-y-6">
            {/* Search Results */}
            {selectedCategories.length > 0 && (
              <div className="rounded-2xl border border-zinc-200 bg-white/95 backdrop-blur-xl p-6 shadow-lg shadow-zinc-100">
                <h2 className="text-xl font-semibold text-zinc-900 mb-4">
                  📋 Resultados de Búsqueda
                </h2>
                
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-zinc-500">Buscando empleos...</p>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-4">
                    {searchResults.slice(0, 5).map((vacancy) => (
                      <div
                        key={vacancy.id}
                        className="p-4 border border-zinc-200 rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-zinc-900">{vacancy.title}</h3>
                          <span className="text-sm text-emerald-600 font-medium">
                            {vacancy.company}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-600 mb-3 line-clamp-2">
                          {vacancy.description}
                        </p>
                        {vacancy.categories && vacancy.categories.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {vacancy.categories.slice(0, 3).map((category) => (
                              <span
                                key={category.id}
                                className="inline-block bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full text-xs font-medium"
                              >
                                {category.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {searchResults.length > 5 && (
                      <p className="text-center text-sm text-zinc-500">
                        Y {searchResults.length - 5} empleos más...
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">🔍</div>
                    <p className="text-zinc-600">
                      No se encontraron empleos para las categorías seleccionadas
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Popular Categories */}
            {popularCategories.length > 0 && (
              <div className="rounded-2xl border border-zinc-200 bg-white/95 backdrop-blur-xl p-6 shadow-lg shadow-zinc-100">
                <h2 className="text-xl font-semibold text-zinc-900 mb-4">
                  🔥 Categorías Populares
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {popularCategories.map((category) => (
                    <div
                      key={category.id}
                      className="p-3 border border-zinc-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => {
                        if (!selectedCategories.includes(category.id) && selectedCategories.length < 3) {
                          setSelectedCategories([...selectedCategories, category.id]);
                        }
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium text-zinc-900">{category.name}</h4>
                          <p className="text-xs text-zinc-500">{category.pathString}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-emerald-600">
                            {category.totalVacancyCount}
                          </div>
                          <div className="text-xs text-zinc-500">empleos</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Category Tree */}
            <div className="rounded-2xl border border-zinc-200 bg-white/95 backdrop-blur-xl p-6 shadow-lg shadow-zinc-100">
              <h2 className="text-xl font-semibold text-zinc-900 mb-4">
                🌳 Árbol de Categorías
              </h2>
              <p className="text-sm text-zinc-600 mb-4">
                Estructura jerárquica completa de categorías de empleo. Cada categoría 
                puede tener subcategorías ilimitadas.
              </p>
              
              <div className="max-h-96 overflow-y-auto space-y-2">
                {categoryTree.slice(0, 3).map(node => renderCategoryNode(node))}
                {categoryTree.length > 3 && (
                  <div className="text-center py-4">
                    <p className="text-sm text-zinc-500">
                      Y {categoryTree.length - 3} categorías principales más...
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Features Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
            <div className="text-3xl mb-3">🎯</div>
            <h3 className="font-semibold text-emerald-900 mb-2">Filtrado Inteligente</h3>
            <p className="text-sm text-emerald-800">
              Busca empleos por categorías específicas con inclusión automática de subcategorías
            </p>
          </div>
          
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 text-center">
            <div className="text-3xl mb-3">🌳</div>
            <h3 className="font-semibold text-blue-900 mb-2">Jerarquía Ilimitada</h3>
            <p className="text-sm text-blue-800">
              Categorías y subcategorías sin límite de profundidad para máxima organización
            </p>
          </div>
          
          <div className="rounded-2xl border border-purple-200 bg-purple-50 p-6 text-center">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="font-semibold text-purple-900 mb-2">Búsqueda Rápida</h3>
            <p className="text-sm text-purple-800">
              Autocompletado y sugerencias inteligentes para encontrar categorías rápidamente
            </p>
          </div>
        </div>

        {/* API Examples */}
        <div className="rounded-2xl border border-zinc-200 bg-white/95 backdrop-blur-xl p-6 shadow-lg shadow-zinc-100">
          <h2 className="text-xl font-semibold text-zinc-900 mb-4">
            🔧 Ejemplos de API
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-zinc-50 rounded-lg">
              <h4 className="font-medium text-zinc-900 mb-2">Buscar por categorías</h4>
              <code className="text-xs text-zinc-700 block">
                GET /vacancies/search/by-categories?categoryIds=cat1,cat2&includeDescendants=true
              </code>
            </div>
            <div className="p-4 bg-zinc-50 rounded-lg">
              <h4 className="font-medium text-zinc-900 mb-2">Obtener árbol de categorías</h4>
              <code className="text-xs text-zinc-700 block">
                GET /categories/tree
              </code>
            </div>
            <div className="p-4 bg-zinc-50 rounded-lg">
              <h4 className="font-medium text-zinc-900 mb-2">Asignar categorías a vacante</h4>
              <code className="text-xs text-zinc-700 block">
                POST /vacancies/:id/categories
              </code>
            </div>
            <div className="p-4 bg-zinc-50 rounded-lg">
              <h4 className="font-medium text-zinc-900 mb-2">Búsqueda avanzada</h4>
              <code className="text-xs text-zinc-700 block">
                POST /vacancies/search/advanced
              </code>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}