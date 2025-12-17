// src/match/match.service.ts
import { Injectable } from '@nestjs/common';
import { VacanciesService } from '../vacancies/vacancies.service';
import { CandidatesService } from '../candidates/candidates.service';
import { CategoriesService } from '../categories/categories.service';
import { CategoryVacancyService } from '../categories/category-vacancy.service';
import { MatchResultDto } from './dto/match-result.dto';
import { MatchQueryDto } from './dto/match-query.dto';
import { 
  CategoryMatch, 
  MatchFactors, 
  CandidatePreferences, 
  MatchConfiguration 
} from './interfaces/match.interface';

@Injectable()
export class MatchService {
  private readonly defaultMatchConfig: MatchConfiguration = {
    enableCategoryMatching: true,
    enableHierarchicalMatching: true,
    categoryMatchWeights: {
      exact: 1.0,
      parent: 0.7,
      child: 0.8,
      sibling: 0.5,
    },
    defaultWeights: {
      location: 0.3,
      category: 0.4,
      experience: 0.2,
      skills: 0.1,
    },
  };

  constructor(
    private readonly vacanciesService: VacanciesService,
    private readonly candidatesService: CandidatesService,
    private readonly categoriesService: CategoriesService,
    private readonly categoryVacancyService: CategoryVacancyService,
  ) {}

  private mapScoreToBucket(score: number) {
    if (score >= 90) return { color: 'green' as const, percentage: '100%' };
    if (score >= 70) return { color: 'yellow' as const, percentage: '80%' };
    return { color: 'red' as const, percentage: '50%' };
  }

  /**
   * Calculate category match score between candidate preferences and vacancy categories
   */
  private async calculateCategoryMatches(
    candidateCategories: string[],
    vacancyCategories: string[]
  ): Promise<CategoryMatch[]> {
    const matches: CategoryMatch[] = [];

    for (const candidateCategoryId of candidateCategories) {
      for (const vacancyCategoryId of vacancyCategories) {
        // Exact match
        if (candidateCategoryId === vacancyCategoryId) {
          const category = await this.categoriesService.findById(candidateCategoryId);
          if (category) {
            matches.push({
              categoryId: candidateCategoryId,
              categoryName: category.name,
              categoryPath: category.pathString,
              matchType: 'exact',
              matchScore: this.defaultMatchConfig.categoryMatchWeights.exact,
            });
          }
          continue;
        }

        // Hierarchical matches
        if (this.defaultMatchConfig.enableHierarchicalMatching) {
          const candidateCategory = await this.categoriesService.findById(candidateCategoryId);
          const vacancyCategory = await this.categoriesService.findById(vacancyCategoryId);

          if (candidateCategory && vacancyCategory) {
            const relationship = this.getCategoryRelationship(candidateCategory, vacancyCategory);
            if (relationship) {
              matches.push({
                categoryId: candidateCategoryId,
                categoryName: candidateCategory.name,
                categoryPath: candidateCategory.pathString,
                matchType: relationship,
                matchScore: this.defaultMatchConfig.categoryMatchWeights[relationship],
              });
            }
          }
        }
      }
    }

    return matches;
  }

  /**
   * Determine relationship between two categories
   */
  private getCategoryRelationship(
    candidateCategory: any,
    vacancyCategory: any
  ): 'parent' | 'child' | 'sibling' | null {
    // Parent relationship: candidate prefers broader category, vacancy is more specific
    if (vacancyCategory.pathString.startsWith(candidateCategory.pathString + '.')) {
      return 'parent';
    }

    // Child relationship: candidate prefers more specific category, vacancy is broader
    if (candidateCategory.pathString.startsWith(vacancyCategory.pathString + '.')) {
      return 'child';
    }

    // Sibling relationship: same parent category
    const candidatePathParts = candidateCategory.pathString.split('.');
    const vacancyPathParts = vacancyCategory.pathString.split('.');
    
    if (candidatePathParts.length > 1 && vacancyPathParts.length > 1) {
      const candidateParentPath = candidatePathParts.slice(0, -1).join('.');
      const vacancyParentPath = vacancyPathParts.slice(0, -1).join('.');
      
      if (candidateParentPath === vacancyParentPath) {
        return 'sibling';
      }
    }

    return null;
  }

  /**
   * Calculate overall category score from matches
   */
  private calculateCategoryScore(matches: CategoryMatch[]): number {
    if (matches.length === 0) return 0;

    // Use the highest match score
    const maxScore = Math.max(...matches.map(m => m.matchScore));
    
    // Bonus for multiple matches
    const matchBonus = Math.min(matches.length * 0.1, 0.3);
    
    return Math.min(maxScore + matchBonus, 1.0) * 100;
  }

  /**
   * Calculate experience match score
   */
  private calculateExperienceScore(
    candidateExperience: string[],
    vacancyRequirements: string[]
  ): number {
    if (!candidateExperience?.length || !vacancyRequirements?.length) return 50;

    const matches = candidateExperience.filter(exp =>
      vacancyRequirements.some(req => 
        exp.toLowerCase().includes(req.toLowerCase()) ||
        req.toLowerCase().includes(exp.toLowerCase())
      )
    );

    return Math.min((matches.length / vacancyRequirements.length) * 100, 100);
  }

  /**
   * Calculate skills match score
   */
  private calculateSkillsScore(
    candidateSkills: string[],
    vacancySkills: string[]
  ): number {
    if (!candidateSkills?.length || !vacancySkills?.length) return 50;

    const matches = candidateSkills.filter(skill =>
      vacancySkills.some(vSkill => 
        skill.toLowerCase().includes(vSkill.toLowerCase()) ||
        vSkill.toLowerCase().includes(skill.toLowerCase())
      )
    );

    return Math.min((matches.length / vacancySkills.length) * 100, 100);
  }

  /**
   * Calculate comprehensive match factors
   */
  private async calculateMatchFactors(
    candidate: any,
    vacancy: any,
    locationScore: number
  ): Promise<MatchFactors> {
    const candidateCategories = candidate.preferredCategories || [];
    const vacancyCategories = await this.categoryVacancyService.getCategoriesForVacancy(vacancy.id);
    
    const categoryMatches = await this.calculateCategoryMatches(
      candidateCategories,
      vacancyCategories.map(c => c.id)
    );
    
    const categoryScore = this.calculateCategoryScore(categoryMatches);
    const experienceScore = this.calculateExperienceScore(
      candidate.experience || [],
      vacancy.requirements || []
    );
    const skillsScore = this.calculateSkillsScore(
      candidate.skills || [],
      vacancy.skills || []
    );

    // Get candidate's custom weights or use defaults
    const weights = candidate.matchWeights || this.defaultMatchConfig.defaultWeights;
    
    const overallScore = 
      (locationScore * weights.location) +
      (categoryScore * weights.category) +
      (experienceScore * weights.experience) +
      (skillsScore * weights.skills);

    return {
      locationScore,
      categoryScore,
      experienceScore,
      skillsScore,
      overallScore: Math.round(overallScore),
    };
  }

  // Enhanced matching with category-based scoring
  async findMatchesForCandidate(
    candidateId: string,
    filters: MatchQueryDto,
  ): Promise<MatchResultDto[]> {
    // 1) Get candidate data
    const candidate = await this.candidatesService.obtenerCandidato(candidateId);
    if (!candidate) return [];

    // 2) Get nearby vacancies
    const radioKm = filters.radioKm ?? candidate.radioKm ?? 10;
    let vacancies = await this.vacanciesService.buscarCercanas(candidateId, radioKm);

    // 3) Filter by categories if specified
    if (filters.categoryIds?.length) {
      const categoryVacancies = await this.categoryVacancyService.getVacanciesByCategory(
        filters.categoryIds[0], // Use first category for now
        filters.includeHierarchical || false
      );
      const categoryVacancyIds = new Set(categoryVacancies.map(v => v.id));
      vacancies = vacancies.filter(v => categoryVacancyIds.has(v.id));
    }

    // 4) Calculate enhanced match scores
    const results: MatchResultDto[] = [];
    
    for (const vacancy of vacancies) {
      const locationScore = typeof vacancy.matchScore === 'number' ? vacancy.matchScore : 80;
      
      let matchFactors: MatchFactors | undefined;
      let categoryMatches: CategoryMatch[] | undefined;
      let matchReasons: string[] = [];

      if (filters.enableDetailedMatching) {
        matchFactors = await this.calculateMatchFactors(candidate, vacancy, locationScore);
        
        // Get category matches for detailed view
        const candidateCategories = candidate.preferredCategories || [];
        const vacancyCategories = await this.categoryVacancyService.getCategoriesForVacancy(vacancy.id);
        categoryMatches = await this.calculateCategoryMatches(
          candidateCategories,
          vacancyCategories.map(c => c.id)
        );

        // Generate match reasons
        if (matchFactors.categoryScore > 70) {
          matchReasons.push('Strong category match');
        }
        if (matchFactors.locationScore > 80) {
          matchReasons.push('Excellent location match');
        }
        if (matchFactors.experienceScore > 70) {
          matchReasons.push('Good experience alignment');
        }
        if (matchFactors.skillsScore > 70) {
          matchReasons.push('Skills match well');
        }
      }

      const finalScore = matchFactors?.overallScore || locationScore;
      
      // Apply minimum category score filter if specified
      if (filters.minCategoryScore && matchFactors && matchFactors.categoryScore < filters.minCategoryScore) {
        continue;
      }

      const { color, percentage } = this.mapScoreToBucket(finalScore);

      // Get vacancy categories for display
      const vacancyCategories = filters.enableDetailedMatching 
        ? await this.categoryVacancyService.getCategoriesForVacancy(vacancy.id)
        : undefined;

      results.push({
        vacante: {
          id: vacancy.id,
          title: vacancy.title,
          company: vacancy.company,
          branchName: vacancy.branchName,
          lat: vacancy.lat,
          lng: vacancy.lng,
          categories: vacancyCategories?.map(c => ({
            id: c.id,
            name: c.name,
            path: c.pathString,
          })),
        },
        score: finalScore,
        color,
        percentage,
        matchFactors,
        categoryMatches,
        matchReasons: matchReasons.length > 0 ? matchReasons : undefined,
      });
    }

    // Sort by score descending
    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Find candidates that match a specific vacancy
   */
  async findCandidatesForVacancy(
    vacancyId: string,
    filters: { radioKm?: number; minCategoryScore?: number } = {}
  ): Promise<any[]> {
    // This would be implemented to find candidates matching a vacancy
    // For now, return empty array as it requires candidate search infrastructure
    return [];
  }

  /**
   * Get match statistics for a candidate
   */
  async getMatchStatistics(candidateId: string): Promise<{
    totalMatches: number;
    averageScore: number;
    categoryBreakdown: { [categoryId: string]: number };
    topCategories: Array<{ categoryId: string; categoryName: string; matchCount: number }>;
  }> {
    const matches = await this.findMatchesForCandidate(candidateId, { enableDetailedMatching: true });
    
    const totalMatches = matches.length;
    const averageScore = matches.length > 0 
      ? matches.reduce((sum, m) => sum + m.score, 0) / matches.length 
      : 0;

    const categoryBreakdown: { [categoryId: string]: number } = {};
    const categoryNames: { [categoryId: string]: string } = {};

    for (const match of matches) {
      if (match.vacante.categories) {
        for (const category of match.vacante.categories) {
          categoryBreakdown[category.id] = (categoryBreakdown[category.id] || 0) + 1;
          categoryNames[category.id] = category.name;
        }
      }
    }

    const topCategories = Object.entries(categoryBreakdown)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([categoryId, matchCount]) => ({
        categoryId,
        categoryName: categoryNames[categoryId],
        matchCount,
      }));

    return {
      totalMatches,
      averageScore: Math.round(averageScore),
      categoryBreakdown,
      topCategories,
    };
  }
}
