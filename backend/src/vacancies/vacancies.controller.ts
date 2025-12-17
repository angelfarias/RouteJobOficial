// backend/src/vacancies/vacancies.controller.ts
// backend/src/vacancies/vacancies.controller.ts

import { Controller, Get, Post, Delete, Param, Body, Query, NotFoundException, HttpCode, HttpStatus, Headers, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { VacanciesService } from './vacancies.service';
import { CategoryVacancyService } from '../categories/category-vacancy.service';
import { CandidateSelectionService } from '../applications/candidate-selection.service';
import { SelectionStatus } from '../applications/interfaces/candidate-selection.interface';

@Controller('vacancies') // prefijo
export class VacanciesController {
  constructor(
    private readonly vacanciesService: VacanciesService,
    private readonly categoryVacancyService: CategoryVacancyService,
    private readonly candidateSelectionService: CandidateSelectionService,
  ) {}

  // Vacantes cercanas para candidato (ya lo tenías)
  @Get('cercanas')
  async getVacantesCercanas(
    @Query('uid') uid: string,
    @Query('radioKm') radioKm?: string,
    @Query('categoryIds') categoryIds?: string,
  ) {
    if (!uid) {
      return { vacantes: [] };
    }
    
    // Parse category IDs from comma-separated string
    const categoryIdArray = categoryIds ? categoryIds.split(',').filter(id => id.trim()) : undefined;
    
    const vacantes = await this.vacanciesService.buscarCercanas(
      uid,
      radioKm ? Number(radioKm) : undefined,
      categoryIdArray,
    );
    return { vacantes };
  }

  // NUEVO: crear vacante para una sucursal concreta
  // POST /vacancies/:companyId/:branchId
  @Post(':companyId/:branchId')
  async createVacancy(
    @Param('companyId') companyId: string,
    @Param('branchId') branchId: string,
    @Body() body: any,
  ) {
    return this.vacanciesService.createVacancy(companyId, branchId, body);
  }

  // NUEVO: listar vacantes por sucursal
  // GET /vacancies/branch/:branchId
  @Get('branch/:branchId')
  async listByBranch(@Param('branchId') branchId: string) {
    const vacantes = await this.vacanciesService.listByBranch(branchId);
    return vacantes;
  }

  // NUEVO: obtener una vacante por id
  // GET /vacancies/:id
  @Get(':id')
  async getById(@Param('id') id: string) {
    const vacante = await this.vacanciesService.findOne(id);
    if (!vacante) {
      throw new NotFoundException('Vacante no encontrada');
    }
    return vacante;
  }

  // ===== VACANCY-CATEGORY ENDPOINTS =====

  // POST /vacancies/:id/categories - Assign categories to vacancy
  @Post(':id/categories')
  @HttpCode(HttpStatus.CREATED)
  async assignCategoriesToVacancy(
    @Param('id') vacancyId: string,
    @Body() body: { categoryIds: string[]; assignedBy?: string },
  ): Promise<void> {
    return this.categoryVacancyService.assignCategories(
      vacancyId,
      body.categoryIds,
      body.assignedBy,
    );
  }

  // DELETE /vacancies/:id/categories - Remove categories from vacancy
  @Delete(':id/categories')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeCategoriesFromVacancy(
    @Param('id') vacancyId: string,
    @Body() body: { categoryIds: string[] },
  ): Promise<void> {
    return this.categoryVacancyService.removeCategories(vacancyId, body.categoryIds);
  }

  // GET /vacancies/:id/categories - Get categories for vacancy
  @Get(':id/categories')
  async getCategoriesForVacancy(@Param('id') vacancyId: string) {
    return this.categoryVacancyService.getCategoriesForVacancy(vacancyId);
  }

  // ===== ENHANCED SEARCH ENDPOINTS =====

  // GET /vacancies/search/by-categories - Search vacancies by categories
  @Get('search/by-categories')
  async searchByCategories(
    @Query('categoryIds') categoryIds: string,
    @Query('includeDescendants') includeDescendants?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    const categoryIdArray = categoryIds ? categoryIds.split(',').filter(id => id.trim()) : [];
    
    if (categoryIdArray.length === 0) {
      return { vacancies: [], total: 0, offset: 0, limit: 50 };
    }

    return this.vacanciesService.searchByCategories(categoryIdArray, {
      includeDescendants: includeDescendants === 'true',
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
      activeOnly: activeOnly !== 'false',
    });
  }

  // POST /vacancies/search/advanced - Advanced vacancy search with filters
  @Post('search/advanced')
  async searchVacancies(@Body() filters: {
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
    return this.vacanciesService.searchVacancies(filters);
  }

  /**
   * GET /vacancies/:vacancyId/selection-status
   * Check if a vacancy has a selected candidate
   * Requires company authentication and authorization
   */
  @Get(':vacancyId/selection-status')
  async getSelectionStatus(
    @Param('vacancyId') vacancyId: string,
    @Headers('x-company-id') companyId: string,
    @Headers('authorization') authorization: string,
  ): Promise<{
    ok: boolean;
    selectionStatus?: SelectionStatus;
    error?: string;
  }> {
    try {
      // Validate authentication
      if (!authorization) {
        throw new UnauthorizedException('Authorization header required');
      }

      // Validate company ID
      if (!companyId) {
        throw new BadRequestException('Company ID header (x-company-id) required');
      }

      // Validate vacancy ID
      if (!vacancyId) {
        throw new BadRequestException('Vacancy ID is required');
      }

      // Get selection status
      const selectionStatus = await this.candidateSelectionService.getSelectionStatus(vacancyId);

      return {
        ok: true,
        selectionStatus,
      };
    } catch (error) {
      console.error('[vacancies-controller] Error getting selection status', error);
      
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }

      return {
        ok: false,
        error: 'Internal server error while retrieving selection status',
      };
    }
  }
}
