"use client";

import { useState, useEffect, useRef } from 'react';
import { CategoryAPI, Category, CategoryNode } from '@/lib/categoryApi';

interface CategoryFilterProps {
  selectedCategories: string[];
  onCategoriesChange: (categoryIds: string[]) => void;
  placeholder?: string;
  maxSelections?: number;
  showPopular?: boolean;
}

export default function CategoryFilter({
  selectedCategories,
  onCategoriesChange,
  placeholder = "Buscar categorías...",
  maxSelections = 5,
  showPopular = true
}: CategoryFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Category[]>([]);
  const [popularCategories, setPopularCategories] = useState<Category[]>([]);
  const [categoryTree, setCategoryTree] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategoryDetails, setSelectedCategoryDetails] = useState<Category[]>([]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [popular, tree] = await Promise.all([
          showPopular ? CategoryAPI.getPopularCategories(10).catch(() => []) : Promise.resolve([]),
          CategoryAPI.getCategoryTree().catch(() => [])
        ]);
        setPopularCategories(popular);
        setCategoryTree(tree);
      } catch (error) {
        console.error('Error loading category data:', error);
        // Set fallback empty data
        setPopularCategories([]);
        setCategoryTree([]);
      }
    };
    loadInitialData();
  }, [showPopular]);

  // Load selected category details
  useEffect(() => {
    const loadSelectedDetails = async () => {
      if (selectedCategories.length === 0) {
        setSelectedCategoryDetails([]);
        return;
      }

      try {
        // Get all categories and filter by selected IDs
        const { categories } = await CategoryAPI.getAllCategories({ limit: 1000 });
        const selected = categories.filter(cat => selectedCategories.includes(cat.id));
        setSelectedCategoryDetails(selected);
      } catch (error) {
        console.error('Error loading selected category details:', error);
      }
    };
    loadSelectedDetails();
  }, [selectedCategories]);

  // Handle search with debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await CategoryAPI.searchCategories(searchQuery, { limit: 20 });
        setSearchResults(results);
      } catch (error) {
        console.error('Error searching categories:', error);
        // If search fails, show empty results but don't break the component
        setSearchResults([]);

        // Optionally show a user-friendly message
        if (error instanceof Error && error.message.includes('Failed to search categories')) {
          console.warn('Categories service may not be available. Using fallback.');
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCategoryToggle = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      // Remove category
      onCategoriesChange(selectedCategories.filter(id => id !== categoryId));
    } else {
      // Add category (if under limit)
      if (selectedCategories.length < maxSelections) {
        onCategoriesChange([...selectedCategories, categoryId]);
      }
    }
  };

  const renderCategoryNode = (node: CategoryNode, depth = 0) => {
    const isSelected = selectedCategories.includes(node.category.id);
    const canSelect = !isSelected && selectedCategories.length < maxSelections;

    return (
      <div key={node.category.id} className={`${depth > 0 ? 'ml-4' : ''}`}>
        <button
          type="button"
          onClick={() => handleCategoryToggle(node.category.id)}
          disabled={!canSelect && !isSelected}
          className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${isSelected
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : canSelect
                ? 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                : 'text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
            }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">{node.category.name}</span>
              {node.category.description && (
                <span className="text-xs text-zinc-500 ml-2">
                  {node.category.description}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              {node.vacancyCount > 0 && (
                <span className="bg-zinc-200 px-2 py-1 rounded-full">
                  {node.vacancyCount}
                </span>
              )}
              {isSelected && (
                <span className="text-emerald-600">✓</span>
              )}
            </div>
          </div>
        </button>
        {node.children.map(child => renderCategoryNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected Categories Display */}
      {selectedCategoryDetails.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {selectedCategoryDetails.map(category => (
            <span
              key={category.id}
              className="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 px-3 py-1 rounded-full text-xs font-medium border border-emerald-200 dark:border-emerald-800"
            >
              {category.name}
              <button
                type="button"
                onClick={() => handleCategoryToggle(category.id)}
                className="hover:bg-emerald-200 rounded-full p-0.5 transition-colors"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-500 border-t-transparent"></div>
          ) : (
            <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>
      </div>

      {/* Selection Counter */}
      <div className="mt-1 text-xs text-zinc-500">
        {selectedCategories.length} de {maxSelections} categorías seleccionadas
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg dark:shadow-none max-h-96 overflow-y-auto">
          {/* Search Results */}
          {searchQuery.trim().length >= 2 && (
            <div className="p-3 border-b border-zinc-100 dark:border-zinc-800">
              <h4 className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-2">
                Resultados de búsqueda
              </h4>
              {searchResults.length > 0 ? (
                <div className="space-y-1">
                  {searchResults.map(category => {
                    const isSelected = selectedCategories.includes(category.id);
                    const canSelect = !isSelected && selectedCategories.length < maxSelections;

                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => handleCategoryToggle(category.id)}
                        disabled={!canSelect && !isSelected}
                        className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${isSelected
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : canSelect
                              ? 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                              : 'text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">{category.name}</span>
                            <span className="text-xs text-zinc-500 ml-2">
                              {category.path.join(' > ')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-zinc-500">
                            {category.totalVacancyCount > 0 && (
                              <span className="bg-zinc-200 px-2 py-1 rounded-full">
                                {category.totalVacancyCount}
                              </span>
                            )}
                            {isSelected && (
                              <span className="text-emerald-600">✓</span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">No se encontraron categorías</p>
              )}
            </div>
          )}

          {/* Popular Categories */}
          {showPopular && popularCategories.length > 0 && searchQuery.trim().length < 2 && (
            <div className="p-3 border-b border-zinc-100 dark:border-zinc-800">
              <h4 className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-2">
                Categorías populares
              </h4>
              <div className="space-y-1">
                {popularCategories.map(category => {
                  const isSelected = selectedCategories.includes(category.id);
                  const canSelect = !isSelected && selectedCategories.length < maxSelections;

                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => handleCategoryToggle(category.id)}
                      disabled={!canSelect && !isSelected}
                      className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${isSelected
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : canSelect
                            ? 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                            : 'text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{category.name}</span>
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          {category.totalVacancyCount > 0 && (
                            <span className="bg-zinc-200 px-2 py-1 rounded-full">
                              {category.totalVacancyCount}
                            </span>
                          )}
                          {isSelected && (
                            <span className="text-emerald-600">✓</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Category Tree */}
          {searchQuery.trim().length < 2 && (
            <div className="p-3">
              <h4 className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-2">
                Todas las categorías
              </h4>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {categoryTree.map(node => renderCategoryNode(node))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}