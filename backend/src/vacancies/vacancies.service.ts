// backend/src/vacancies/vacancies.service.ts
import { Inject, Injectable } from '@nestjs/common';
import type { App } from 'firebase-admin/app';
import { getFirestore, Firestore, Timestamp } from 'firebase-admin/firestore';
import { CategoryVacancyService } from '../categories/category-vacancy.service';

@Injectable()
export class VacanciesService {
  private db: Firestore;

  constructor(
    @Inject('FIREBASE_ADMIN') private readonly firebaseApp: App,
    private readonly categoryVacancyService: CategoryVacancyService,
  ) {
    this.db = getFirestore(this.firebaseApp);
  }

  private toRad(v: number) {
    return (v * Math.PI) / 180;
  }

  // --------- NUEVO: crear vacante por sucursal ----------
  async createVacancy(companyId: string, branchId: string, dto: any) {
    const docRef = this.db.collection('vacancies').doc();
    const now = Timestamp.now();

    const data = {
      companyId,
      branchId,
      title: dto.title,
      description: dto.description || '',
      salaryMin: dto.salaryMin ?? null,
      salaryMax: dto.salaryMax ?? null,
      jornada: dto.jornada || '',
      tipoContrato: dto.tipoContrato || '',
      active: true,
      createdAt: now,
      updatedAt: now,
      // ubicación viene de la sucursal
      location: {
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
      // opcional: nombre visible en mapa
      company: dto.company || null,
      branchName: dto.branchName || null,
    };

    await docRef.set(data);
    
    const vacancy = { id: docRef.id, ...data };
    
    // If category IDs are provided, assign them after vacancy creation
    if (dto.categoryIds && dto.categoryIds.length > 0) {
      try {
        await this.categoryVacancyService.assignCategories(
          docRef.id,
          dto.categoryIds,
          dto.assignedBy || 'system'
        );
      } catch (error) {
        console.warn(`Failed to assign categories to vacancy ${docRef.id}:`, error);
        // Don't fail the vacancy creation if category assignment fails
      }
    }
    
    return vacancy;
  }

  // --------- NUEVO: listar vacantes por sucursal ----------
  async listByBranch(branchId: string) {
    const snap = await this.db
      .collection('vacancies')
      .where('branchId', '==', branchId)
      .where('active', '==', true)
      .get();

    return snap.docs.map((doc) => {
      const v = doc.data() as any;
      const loc = v.location || {};
      return {
        id: doc.id,
        title: v.title,
        company: v.company,
        branchName: v.branchName,
        lat: loc.latitude,
        lng: loc.longitude,
        salaryMin: v.salaryMin,
        salaryMax: v.salaryMax,
        jornada: v.jornada,
        tipoContrato: v.tipoContrato,
      };
    });
  }
  async findOne(id: string) {
    const docRef = this.db.collection('vacancies').doc(id);
    const snap = await docRef.get();

    if (!snap.exists) {
      return null;
    }

    const data = snap.data() as any;

    // Get categories for this vacancy
    let categories: any[] = [];
    try {
      categories = await this.categoryVacancyService.getCategoriesForVacancy(id);
    } catch (error) {
      console.warn(`Failed to get categories for vacancy ${id}:`, error);
    }

    return {
      id: snap.id,
      title: data.title,
      description: data.description,
      salaryMin: data.salaryMin,
      salaryMax: data.salaryMax,
      jornada: data.jornada,
      tipoContrato: data.tipoContrato,
      company: data.company,
      branchName: data.branchName,
      location: data.location,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      categories: categories,
    };
  }

  // --------- YA EXISTENTE: buscar cercanas ----------
  async buscarCercanas(uid: string, radioKmParam?: number, categoryIds?: string[]) {
    const candSnap = await this.db.collection('candidates').doc(uid).get();
    if (!candSnap.exists) return [];

    const cand = candSnap.data() as any;
    const center = cand.location;

    if (
      !center ||
      typeof center.latitude !== 'number' ||
      typeof center.longitude !== 'number'
    ) {
      console.log('[vacancies] candidato sin ubicación válida', uid, center);
      return [];
    }

    const radioKm = radioKmParam || cand.radioKm || 10;
    console.log('[vacancies] centro candidato', center, 'radioKm', radioKm);

    const vacSnap = await this.db
      .collection('vacancies')
      .where('active', '==', true)
      .get();

    const R = 6371;
    const vacantes: any[] = [];

    vacSnap.forEach((doc) => {
      const v = doc.data() as any;
      const loc = v.location;

      if (
        !loc ||
        typeof loc.latitude !== 'number' ||
        typeof loc.longitude !== 'number'
      ) {
        console.log('[vacancies] vacante sin location válida', doc.id, loc);
        return;
      }

      const dLat = this.toRad(loc.latitude - center.latitude);
      const dLng = this.toRad(loc.longitude - center.longitude);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(this.toRad(center.latitude)) *
          Math.cos(this.toRad(loc.latitude)) *
          Math.sin(dLng / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distanciaKm = R * c;

      console.log(
        '[vacancies] vacante',
        doc.id,
        'distanciaKm',
        distanciaKm.toFixed(2),
      );

      if (distanciaKm <= radioKm) {
        vacantes.push({
          id: doc.id,
          title: v.title,
          company: v.company,
          branchName: v.branchName,
          lat: loc.latitude,
          lng: loc.longitude,
          matchScore: v.matchScore ?? 80,
          distanceKm: distanciaKm,
        });
      }
    });

    console.log('[vacancies] total dentro del radio', vacantes.length);

    // Apply category filtering if categoryIds are provided
    if (categoryIds && categoryIds.length > 0) {
      const filteredVacantes: any[] = [];
      
      for (const vacancy of vacantes) {
        try {
          const vacancyCategories = await this.categoryVacancyService.getCategoriesForVacancy(vacancy.id);
          const vacancyCategoryIds = vacancyCategories.map(cat => cat.id);
          
          // Check if vacancy has any of the requested categories
          const hasMatchingCategory = categoryIds.some(catId => vacancyCategoryIds.includes(catId));
          
          if (hasMatchingCategory) {
            filteredVacantes.push({
              ...vacancy,
              categories: vacancyCategories,
            });
          }
        } catch (error) {
          console.warn(`Failed to get categories for vacancy ${vacancy.id}:`, error);
          // Include vacancy without category info if category lookup fails
          filteredVacantes.push(vacancy);
        }
      }
      
      console.log('[vacancies] total después de filtro por categorías', filteredVacantes.length);
      return filteredVacantes;
    }

    return vacantes;
  }

  // --------- NUEVO: buscar vacantes por categorías ----------
  async searchByCategories(categoryIds: string[], options?: {
    includeDescendants?: boolean;
    limit?: number;
    offset?: number;
    activeOnly?: boolean;
  }) {
    const opts = {
      includeDescendants: options?.includeDescendants ?? false,
      limit: options?.limit ?? 50,
      offset: options?.offset ?? 0,
      activeOnly: options?.activeOnly ?? true,
    };

    // Get all vacancies for the specified categories
    const allVacancies: any[] = [];
    
    for (const categoryId of categoryIds) {
      try {
        const categoryVacancies = await this.categoryVacancyService.getVacanciesByCategory(
          categoryId,
          opts.includeDescendants
        );
        allVacancies.push(...categoryVacancies);
      } catch (error) {
        console.warn(`Failed to get vacancies for category ${categoryId}:`, error);
      }
    }

    // Remove duplicates (vacancy might be in multiple categories)
    const uniqueVacancies = allVacancies.filter((vacancy, index, self) => 
      index === self.findIndex(v => v.id === vacancy.id)
    );

    // Filter by active status if requested
    let filteredVacancies = uniqueVacancies;
    if (opts.activeOnly) {
      filteredVacancies = uniqueVacancies.filter(v => v.active !== false);
    }

    // Apply pagination
    const paginatedVacancies = filteredVacancies.slice(opts.offset, opts.offset + opts.limit);

    // Enrich with category information
    const enrichedVacancies: any[] = [];
    for (const vacancy of paginatedVacancies) {
      try {
        const categories = await this.categoryVacancyService.getCategoriesForVacancy(vacancy.id);
        enrichedVacancies.push({
          ...vacancy,
          categories,
        });
      } catch (error) {
        console.warn(`Failed to get categories for vacancy ${vacancy.id}:`, error);
        enrichedVacancies.push(vacancy);
      }
    }

    return {
      vacancies: enrichedVacancies,
      total: filteredVacancies.length,
      offset: opts.offset,
      limit: opts.limit,
    };
  }

  // --------- NUEVO: buscar vacantes con filtros avanzados ----------
  async searchVacancies(filters: {
    categoryIds?: string[];
    includeDescendants?: boolean;
    companyId?: string;
    branchId?: string;
    salaryMin?: number;
    salaryMax?: number;
    jornada?: string;
    tipoContrato?: string;
    location?: {
      latitude: number;
      longitude: number;
      radiusKm: number;
    };
    activeOnly?: boolean;
    limit?: number;
    offset?: number;
    sortBy?: 'createdAt' | 'salary' | 'distance';
    sortOrder?: 'asc' | 'desc';
  }) {
    const opts = {
      activeOnly: filters.activeOnly ?? true,
      limit: filters.limit ?? 50,
      offset: filters.offset ?? 0,
      sortBy: filters.sortBy ?? 'createdAt',
      sortOrder: filters.sortOrder ?? 'desc',
    };

    // Start with base query
    let query: any = this.db.collection('vacancies');

    // Apply basic filters
    if (opts.activeOnly) {
      query = query.where('active', '==', true);
    }

    if (filters.companyId) {
      query = query.where('companyId', '==', filters.companyId);
    }

    if (filters.branchId) {
      query = query.where('branchId', '==', filters.branchId);
    }

    if (filters.jornada) {
      query = query.where('jornada', '==', filters.jornada);
    }

    if (filters.tipoContrato) {
      query = query.where('tipoContrato', '==', filters.tipoContrato);
    }

    // Execute base query
    const snapshot = await query.get();
    let vacancies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Apply salary filters in memory (Firestore doesn't support range queries with other filters)
    if (filters.salaryMin !== undefined) {
      vacancies = vacancies.filter(v => v.salaryMin >= filters.salaryMin!);
    }

    if (filters.salaryMax !== undefined) {
      vacancies = vacancies.filter(v => v.salaryMax <= filters.salaryMax!);
    }

    // Apply location filter if provided
    if (filters.location) {
      const { latitude, longitude, radiusKm } = filters.location;
      const R = 6371; // Earth's radius in km

      vacancies = vacancies.filter(vacancy => {
        const loc = vacancy.location;
        if (!loc || typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') {
          return false;
        }

        const dLat = this.toRad(loc.latitude - latitude);
        const dLng = this.toRad(loc.longitude - longitude);
        const a = Math.sin(dLat / 2) ** 2 +
          Math.cos(this.toRad(latitude)) *
          Math.cos(this.toRad(loc.latitude)) *
          Math.sin(dLng / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        return distance <= radiusKm;
      });
    }

    // Apply category filter if provided
    if (filters.categoryIds && filters.categoryIds.length > 0) {
      const categoryFilteredVacancies: any[] = [];
      
      for (const vacancy of vacancies) {
        try {
          const vacancyCategories = await this.categoryVacancyService.getCategoriesForVacancy(vacancy.id);
          const vacancyCategoryIds = vacancyCategories.map(cat => cat.id);
          
          // Check if vacancy has any of the requested categories
          const hasMatchingCategory = filters.categoryIds!.some(catId => vacancyCategoryIds.includes(catId));
          
          if (hasMatchingCategory) {
            categoryFilteredVacancies.push({
              ...vacancy,
              categories: vacancyCategories,
            });
          }
        } catch (error) {
          console.warn(`Failed to get categories for vacancy ${vacancy.id}:`, error);
        }
      }
      
      vacancies = categoryFilteredVacancies;
    } else {
      // Add category information to all vacancies
      const enrichedVacancies: any[] = [];
      for (const vacancy of vacancies) {
        try {
          const categories = await this.categoryVacancyService.getCategoriesForVacancy(vacancy.id);
          enrichedVacancies.push({
            ...vacancy,
            categories,
          });
        } catch (error) {
          console.warn(`Failed to get categories for vacancy ${vacancy.id}:`, error);
          enrichedVacancies.push(vacancy);
        }
      }
      vacancies = enrichedVacancies;
    }

    // Apply sorting
    vacancies.sort((a, b) => {
      let comparison = 0;
      
      switch (opts.sortBy) {
        case 'createdAt':
          comparison = (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
          break;
        case 'salary':
          const aSalary = a.salaryMax || a.salaryMin || 0;
          const bSalary = b.salaryMax || b.salaryMin || 0;
          comparison = aSalary - bSalary;
          break;
        case 'distance':
          // Distance sorting would require location context
          comparison = 0;
          break;
      }

      return opts.sortOrder === 'desc' ? -comparison : comparison;
    });

    // Apply pagination
    const total = vacancies.length;
    const paginatedVacancies = vacancies.slice(opts.offset, opts.offset + opts.limit);

    return {
      vacancies: paginatedVacancies,
      total,
      offset: opts.offset,
      limit: opts.limit,
    };
  }
}