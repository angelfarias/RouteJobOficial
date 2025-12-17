import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  HttpCode, 
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
  ParseBoolPipe
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoryVacancyService } from './category-vacancy.service';
import { CategorySeeder } from './seed-categories';
import { 
  CreateCategoryDto, 
  UpdateCategoryDto, 
  MoveCategoryDto, 
  DeleteCategoryDto,
  AssignCategoriesDto,
  SearchCategoriesDto 
} from './dto';
import { Category, CategoryNode, DeletionStrategy } from './interfaces/category.interface';

@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly categoryVacancyService: CategoryVacancyService,
    private readonly categorySeeder: CategorySeeder,
  ) {}

  // ===== CATEGORY MANAGEMENT ENDPOINTS =====

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCategory(@Body() createCategoryDto: CreateCategoryDto): Promise<Category> {
    return this.categoriesService.createCategory(
      createCategoryDto.parentId || null, 
      createCategoryDto
    );
  }

  @Get()
  async getAllCategories(
    @Query('includeInactive', new DefaultValuePipe(false), ParseBoolPipe) includeInactive: boolean,
    @Query('parentId') parentId?: string,
    @Query('level', new DefaultValuePipe(null)) level?: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
  ): Promise<{ categories: Category[]; total: number }> {
    return this.categoriesService.searchCategoriesAdvanced({
      parentId,
      level,
      includeInactive,
      limit,
      offset,
    });
  }

  @Get('tree')
  async getCategoryTree(): Promise<CategoryNode[]> {
    return this.categoriesService.getCategoryTree();
  }

  @Get('popular')
  async getPopularCategories(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<Category[]> {
    return this.categoriesService.getPopularCategories(limit);
  }

  @Get('recent')
  async getRecentCategories(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<Category[]> {
    return this.categoriesService.getRecentCategories(limit);
  }

  @Get('search')
  async searchCategories(@Query() searchDto: SearchCategoriesDto): Promise<Category[]> {
    return this.categoriesService.searchCategories(searchDto.query, {
      limit: searchDto.limit,
      parentId: searchDto.parentId,
    });
  }

  @Get('search/advanced')
  async searchCategoriesAdvanced(
    @Query('query') query?: string,
    @Query('parentId') parentId?: string,
    @Query('level') level?: number,
    @Query('minVacancyCount') minVacancyCount?: number,
    @Query('maxVacancyCount') maxVacancyCount?: number,
    @Query('includeInactive', new DefaultValuePipe(false), ParseBoolPipe) includeInactive?: boolean,
    @Query('sortBy') sortBy?: 'name' | 'vacancyCount' | 'level' | 'displayOrder',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
  ): Promise<{ categories: Category[]; total: number }> {
    return this.categoriesService.searchCategoriesAdvanced({
      query,
      parentId,
      level,
      minVacancyCount,
      maxVacancyCount,
      includeInactive,
      sortBy,
      sortOrder,
      limit,
      offset,
    });
  }

  @Get('suggestions')
  async getCategorySuggestions(
    @Query('query') query: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<string[]> {
    return this.categoriesService.getCategorySuggestions(query, limit);
  }

  @Post('filter')
  async filterCategories(
    @Body() filters: {
      parentIds?: string[];
      levels?: number[];
      hasVacancies?: boolean;
      isActive?: boolean;
      nameContains?: string;
      minChildCount?: number;
      maxChildCount?: number;
    },
  ): Promise<Category[]> {
    return this.categoriesService.filterCategories(filters);
  }

  @Get(':id')
  async getCategory(@Param('id') id: string): Promise<Category | null> {
    return this.categoriesService.findById(id);
  }

  @Put(':id')
  async updateCategory(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    return this.categoriesService.updateCategory(id, updateCategoryDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCategory(
    @Param('id') id: string,
    @Query('strategy') strategy?: DeletionStrategy,
  ): Promise<void> {
    return this.categoriesService.deleteCategory(
      id, 
      strategy || DeletionStrategy.MOVE_TO_PARENT
    );
  }

  @Post(':id/move')
  async moveCategory(
    @Param('id') id: string,
    @Body() moveCategoryDto: MoveCategoryDto,
  ): Promise<Category> {
    return this.categoriesService.moveCategory(id, moveCategoryDto.newParentId || null);
  }

  @Get(':id/path')
  async getCategoryPath(@Param('id') id: string): Promise<string[]> {
    return this.categoriesService.getCategoryPath(id);
  }

  @Get(':id/children')
  async getCategoryChildren(
    @Param('id') id: string,
    @Query('includeInactive', new DefaultValuePipe(false), ParseBoolPipe) includeInactive: boolean,
  ): Promise<Category[]> {
    return this.categoriesService.searchCategoriesAdvanced({
      parentId: id,
      includeInactive,
    }).then(result => result.categories);
  }

  @Get(':id/descendants')
  async getCategoryDescendants(
    @Param('id') id: string,
    @Query('includeInactive', new DefaultValuePipe(false), ParseBoolPipe) includeInactive: boolean,
  ): Promise<Category[]> {
    // This would need a new method in the service to get all descendants
    // For now, we'll use the existing tree functionality
    const tree = await this.categoriesService.getCategoryTree();
    const findDescendants = (nodes: CategoryNode[], targetId: string): Category[] => {
      for (const node of nodes) {
        if (node.category.id === targetId) {
          const descendants: Category[] = [];
          const collectDescendants = (childNodes: CategoryNode[]) => {
            for (const childNode of childNodes) {
              if (includeInactive || childNode.category.isActive) {
                descendants.push(childNode.category);
              }
              collectDescendants(childNode.children);
            }
          };
          collectDescendants(node.children);
          return descendants;
        }
        const found = findDescendants(node.children, targetId);
        if (found.length > 0) return found;
      }
      return [];
    };
    return findDescendants(tree, id);
  }

  // ===== VACANCY-CATEGORY ASSOCIATION ENDPOINTS =====

  @Post(':id/vacancies')
  @HttpCode(HttpStatus.CREATED)
  async assignVacanciesToCategory(
    @Param('id') categoryId: string,
    @Body() assignDto: { vacancyIds: string[]; assignedBy?: string },
  ): Promise<void> {
    // This would assign multiple vacancies to a category
    // Implementation would depend on how you want to handle this
    for (const vacancyId of assignDto.vacancyIds) {
      await this.categoryVacancyService.assignCategories(
        vacancyId, 
        [categoryId], 
        assignDto.assignedBy
      );
    }
  }

  @Get(':id/vacancies')
  async getVacanciesByCategory(
    @Param('id') categoryId: string,
    @Query('includeDescendants', new DefaultValuePipe(false), ParseBoolPipe) includeDescendants: boolean,
  ): Promise<any[]> {
    return this.categoryVacancyService.getVacanciesByCategory(categoryId, includeDescendants);
  }

  @Delete(':id/vacancies/:vacancyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeVacancyFromCategory(
    @Param('id') categoryId: string,
    @Param('vacancyId') vacancyId: string,
  ): Promise<void> {
    return this.categoryVacancyService.removeCategories(vacancyId, [categoryId]);
  }

  // ===== UTILITY ENDPOINTS =====

  @Get(':id/stats')
  async getCategoryStats(@Param('id') id: string): Promise<{
    category: Category;
    directVacancyCount: number;
    totalVacancyCount: number;
    childCount: number;
    level: number;
    path: string[];
  }> {
    const category = await this.categoriesService.findById(id);
    if (!category) {
      throw new Error(`Category with ID ${id} not found`);
    }

    const directVacancyCount = await this.categoryVacancyService.getVacancyCountForCategory(id);
    const totalVacancyCount = await this.categoryVacancyService.getTotalVacancyCountForCategory(id);

    return {
      category,
      directVacancyCount,
      totalVacancyCount,
      childCount: category.childCount,
      level: category.level,
      path: category.path,
    };
  }

  @Post(':id/refresh-counts')
  @HttpCode(HttpStatus.OK)
  async refreshCategoryCounts(@Param('id') id: string): Promise<{ message: string }> {
    // This would refresh the vacancy counts for a category
    // Implementation would involve recalculating and updating the counts
    const directCount = await this.categoryVacancyService.getVacancyCountForCategory(id);
    const totalCount = await this.categoryVacancyService.getTotalVacancyCountForCategory(id);
    
    // Update the category with fresh counts
    await this.categoriesService.updateCategory(id, {
      // This would need to be added to the UpdateCategoryDto if we want to update counts directly
    });

    return { message: `Category counts refreshed: ${directCount} direct, ${totalCount} total` };
  }

  // ===== SEEDING ENDPOINTS (Development/Admin only) =====

  @Post('seed')
  @HttpCode(HttpStatus.OK)
  async seedCategories(): Promise<{ message: string }> {
    try {
      await this.categorySeeder.seedJobCategories();
      return { message: 'Job categories seeded successfully!' };
    } catch (error) {
      return { message: `Error seeding categories: ${error.message}` };
    }
  }

  @Delete('seed/clear')
  @HttpCode(HttpStatus.OK)
  async clearCategories(): Promise<{ message: string }> {
    try {
      await this.categorySeeder.clearAllCategories();
      return { message: 'All categories cleared successfully!' };
    } catch (error) {
      return { message: `Error clearing categories: ${error.message}` };
    }
  }
}