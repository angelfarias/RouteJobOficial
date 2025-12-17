// backend/src/match/match.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { MatchService } from './match.service';
import { VacanciesService } from '../vacancies/vacancies.service';
import { CandidatesService } from '../candidates/candidates.service';
import { CategoriesService } from '../categories/categories.service';
import { CategoryVacancyService } from '../categories/category-vacancy.service';
import * as fc from 'fast-check';

describe('MatchService', () => {
  let service: MatchService;
  let vacanciesService: jest.Mocked<VacanciesService>;
  let candidatesService: jest.Mocked<CandidatesService>;
  let categoriesService: jest.Mocked<CategoriesService>;
  let categoryVacancyService: jest.Mocked<CategoryVacancyService>;

  const mockCandidate = {
    uid: 'candidate-1',
    preferredCategories: ['cat-1', 'cat-2'],
    experience: ['JavaScript', 'Node.js'],
    skills: ['React', 'TypeScript'],
    location: { latitude: 40.7128, longitude: -74.0060 },
    radioKm: 10,
    matchWeights: {
      location: 0.3,
      category: 0.4,
      experience: 0.2,
      skills: 0.1,
    },
  };

  const mockVacancy = {
    id: 'vacancy-1',
    title: 'Frontend Developer',
    company: 'Tech Corp',
    branchName: 'Main Branch',
    lat: 40.7589,
    lng: -73.9851,
    requirements: ['JavaScript', 'React'],
    skills: ['React', 'TypeScript', 'CSS'],
    matchScore: 85,
  };

  const mockCategories = [
    {
      id: 'cat-1',
      name: 'Technology',
      path: ['technology'],
      pathString: 'technology',
      level: 0,
      parentId: null,
    },
    {
      id: 'cat-2',
      name: 'Frontend Development',
      path: ['technology', 'frontend'],
      pathString: 'technology.frontend',
      level: 1,
      parentId: 'cat-1',
    },
    {
      id: 'cat-3',
      name: 'React Development',
      path: ['technology', 'frontend', 'react'],
      pathString: 'technology.frontend.react',
      level: 2,
      parentId: 'cat-2',
    },
  ];

  beforeEach(async () => {
    const mockVacanciesService = {
      buscarCercanas: jest.fn(),
    };

    const mockCandidatesService = {
      obtenerCandidato: jest.fn(),
      actualizarCategoryPreferences: jest.fn(),
      actualizarMatchWeights: jest.fn(),
    };

    const mockCategoriesService = {
      findById: jest.fn(),
    };

    const mockCategoryVacancyService = {
      getCategoriesForVacancy: jest.fn(),
      getVacanciesByCategory: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchService,
        { provide: VacanciesService, useValue: mockVacanciesService },
        { provide: CandidatesService, useValue: mockCandidatesService },
        { provide: CategoriesService, useValue: mockCategoriesService },
        { provide: CategoryVacancyService, useValue: mockCategoryVacancyService },
      ],
    }).compile();

    service = module.get<MatchService>(MatchService);
    vacanciesService = module.get(VacanciesService);
    candidatesService = module.get(CandidatesService);
    categoriesService = module.get(CategoriesService);
    categoryVacancyService = module.get(CategoryVacancyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findMatchesForCandidate', () => {
    beforeEach(() => {
      candidatesService.obtenerCandidato.mockResolvedValue(mockCandidate);
      vacanciesService.buscarCercanas.mockResolvedValue([mockVacancy]);
      categoryVacancyService.getCategoriesForVacancy.mockResolvedValue([
        { id: 'cat-2', name: 'Frontend Development', path: 'technology/frontend' }
      ]);
      categoriesService.findById.mockImplementation((id) => {
        return Promise.resolve(mockCategories.find(c => c.id === id));
      });
    });

    it('should return empty array for non-existent candidate', async () => {
      candidatesService.obtenerCandidato.mockResolvedValue(null);

      const result = await service.findMatchesForCandidate('non-existent', {});

      expect(result).toEqual([]);
    });

    it('should return basic matches without detailed matching', async () => {
      const result = await service.findMatchesForCandidate('candidate-1', {});

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        vacante: {
          id: 'vacancy-1',
          title: 'Frontend Developer',
          company: 'Tech Corp',
        },
        score: 85,
        color: 'yellow',
        percentage: '80%',
      });
      expect(result[0].matchFactors).toBeUndefined();
      expect(result[0].categoryMatches).toBeUndefined();
    });

    it('should return detailed matches with category scoring', async () => {
      const result = await service.findMatchesForCandidate('candidate-1', {
        enableDetailedMatching: true,
      });

      expect(result).toHaveLength(1);
      expect(result[0].matchFactors).toBeDefined();
      expect(result[0].matchFactors?.categoryScore).toBeGreaterThan(0);
      expect(result[0].matchFactors?.experienceScore).toBeGreaterThan(0);
      expect(result[0].matchFactors?.skillsScore).toBeGreaterThan(0);
      expect(result[0].categoryMatches).toBeDefined();
      expect(result[0].matchReasons).toBeDefined();
    });

    it('should filter by category when categoryIds provided', async () => {
      categoryVacancyService.getVacanciesByCategory.mockResolvedValue([mockVacancy]);

      const result = await service.findMatchesForCandidate('candidate-1', {
        categoryIds: ['cat-2'],
      });

      expect(categoryVacancyService.getVacanciesByCategory).toHaveBeenCalledWith('cat-2', false);
      expect(result).toHaveLength(1);
    });

    it('should apply minimum category score filter', async () => {
      // Mock a scenario with low category score
      categoryVacancyService.getCategoriesForVacancy.mockResolvedValue([
        { id: 'cat-unrelated', name: 'Unrelated Category', path: ['unrelated'], pathString: 'unrelated' }
      ]);
      categoriesService.findById.mockImplementation((id) => {
        if (id === 'cat-unrelated') {
          return Promise.resolve({
            id: 'cat-unrelated',
            name: 'Unrelated Category',
            path: ['unrelated'],
            pathString: 'unrelated',
            level: 0,
            parentId: null,
          });
        }
        return Promise.resolve(mockCategories.find(c => c.id === id));
      });

      const result = await service.findMatchesForCandidate('candidate-1', {
        enableDetailedMatching: true,
        minCategoryScore: 50, // Threshold that should filter out no-match categories
      });

      // Should filter out matches with low category scores (0 in this case)
      expect(result).toHaveLength(0);
    });

    it('should sort results by score descending', async () => {
      const lowScoreVacancy = { ...mockVacancy, id: 'vacancy-2', matchScore: 60 };
      vacanciesService.buscarCercanas.mockResolvedValue([lowScoreVacancy, mockVacancy]);
      categoryVacancyService.getCategoriesForVacancy.mockResolvedValue([]);

      const result = await service.findMatchesForCandidate('candidate-1', {});

      expect(result).toHaveLength(2);
      expect(result[0].score).toBeGreaterThanOrEqual(result[1].score);
    });
  });

  describe('getMatchStatistics', () => {
    beforeEach(() => {
      candidatesService.obtenerCandidato.mockResolvedValue(mockCandidate);
      vacanciesService.buscarCercanas.mockResolvedValue([mockVacancy]);
      categoryVacancyService.getCategoriesForVacancy.mockResolvedValue([
        { id: 'cat-2', name: 'Frontend Development', path: 'technology/frontend' }
      ]);
      categoriesService.findById.mockImplementation((id) => {
        return Promise.resolve(mockCategories.find(c => c.id === id));
      });
    });

    it('should calculate match statistics correctly', async () => {
      const stats = await service.getMatchStatistics('candidate-1');

      expect(stats).toMatchObject({
        totalMatches: 1,
        averageScore: expect.any(Number),
        categoryBreakdown: expect.any(Object),
        topCategories: expect.any(Array),
      });
      expect(stats.averageScore).toBeGreaterThan(0);
      expect(stats.topCategories).toHaveLength(1);
      expect(stats.topCategories[0]).toMatchObject({
        categoryId: 'cat-2',
        categoryName: 'Frontend Development',
        matchCount: 1,
      });
    });

    it('should handle empty matches', async () => {
      vacanciesService.buscarCercanas.mockResolvedValue([]);

      const stats = await service.getMatchStatistics('candidate-1');

      expect(stats).toMatchObject({
        totalMatches: 0,
        averageScore: 0,
        categoryBreakdown: {},
        topCategories: [],
      });
    });
  });

  // Property-based tests
  describe('Property-based tests', () => {
    it('Property 10: Matching algorithm integration - category preferences should influence match scores', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string(), { minLength: 1, maxLength: 5 }), // candidate categories
          fc.array(fc.string(), { minLength: 1, maxLength: 5 }), // vacancy categories
          fc.integer({ min: 50, max: 100 }), // base location score
          async (candidateCategories, vacancyCategories, locationScore) => {
            // Setup mocks
            const candidate = {
              ...mockCandidate,
              preferredCategories: candidateCategories,
            };
            const vacancy = {
              ...mockVacancy,
              matchScore: locationScore,
            };

            candidatesService.obtenerCandidato.mockResolvedValue(candidate);
            vacanciesService.buscarCercanas.mockResolvedValue([vacancy]);
            categoryVacancyService.getCategoriesForVacancy.mockResolvedValue(
              vacancyCategories.map((id, index) => ({
                id,
                name: `Category ${index}`,
                path: ['path', id],
                pathString: `path.${id}`,
              }))
            );
            categoriesService.findById.mockImplementation((id) => {
              const index = candidateCategories.indexOf(id) !== -1 
                ? candidateCategories.indexOf(id) 
                : vacancyCategories.indexOf(id);
              return Promise.resolve({
                id,
                name: `Category ${index}`,
                path: ['path', id],
                pathString: `path.${id}`,
                level: 0,
                parentId: null,
              });
            });

            const result = await service.findMatchesForCandidate('candidate-1', {
              enableDetailedMatching: true,
            });

            if (result.length > 0) {
              const match = result[0];
              
              // Category preferences should influence the overall score
              expect(match.matchFactors).toBeDefined();
              expect(match.matchFactors!.categoryScore).toBeGreaterThanOrEqual(0);
              expect(match.matchFactors!.categoryScore).toBeLessThanOrEqual(100);
              
              // Overall score should be calculated from all factors
              expect(match.matchFactors!.overallScore).toBeGreaterThanOrEqual(0);
              expect(match.matchFactors!.overallScore).toBeLessThanOrEqual(100);
              
              // If there are matching categories, category score should be positive
              const hasMatchingCategories = candidateCategories.some(cc => 
                vacancyCategories.includes(cc)
              );
              if (hasMatchingCategories) {
                expect(match.matchFactors!.categoryScore).toBeGreaterThan(0);
              }
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('Property: Category hierarchy should be considered in matching', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string(), // parent category
          fc.string(), // child category
          async (parentId, childId) => {
            fc.pre(parentId !== childId); // Ensure different IDs

            const parentCategory = {
              id: parentId,
              name: 'Parent Category',
              path: ['parent'],
              pathString: 'parent',
              level: 0,
              parentId: null,
            };

            const childCategory = {
              id: childId,
              name: 'Child Category',
              path: ['parent', 'child'],
              pathString: 'parent.child',
              level: 1,
              parentId: parentId,
            };

            const candidate = {
              ...mockCandidate,
              preferredCategories: [parentId], // Candidate prefers parent
            };

            const vacancy = {
              ...mockVacancy,
            };

            candidatesService.obtenerCandidato.mockResolvedValue(candidate);
            vacanciesService.buscarCercanas.mockResolvedValue([vacancy]);
            categoryVacancyService.getCategoriesForVacancy.mockResolvedValue([
              { id: childId, name: 'Child Category', path: ['parent', 'child'], pathString: 'parent.child' }
            ]);
            categoriesService.findById.mockImplementation((id) => {
              if (id === parentId) return Promise.resolve(parentCategory);
              if (id === childId) return Promise.resolve(childCategory);
              return Promise.resolve(null);
            });

            const result = await service.findMatchesForCandidate('candidate-1', {
              enableDetailedMatching: true,
            });

            if (result.length > 0) {
              const match = result[0];
              
              // Should have category matches due to hierarchy
              expect(match.categoryMatches).toBeDefined();
              if (match.categoryMatches && match.categoryMatches.length > 0) {
                const hierarchicalMatch = match.categoryMatches.find(cm => 
                  cm.matchType === 'parent'
                );
                expect(hierarchicalMatch).toBeDefined();
                expect(hierarchicalMatch!.matchScore).toBeGreaterThan(0);
                expect(hierarchicalMatch!.matchScore).toBeLessThan(1.0); // Less than exact match
              }
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('Property: Match scores should be consistent and bounded', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            locationScore: fc.integer({ min: 0, max: 100 }),
            categoryScore: fc.integer({ min: 0, max: 100 }),
            experienceScore: fc.integer({ min: 0, max: 100 }),
            skillsScore: fc.integer({ min: 0, max: 100 }),
          }),
          async (scores) => {
            const candidate = {
              ...mockCandidate,
              experience: ['skill1', 'skill2'],
              skills: ['tech1', 'tech2'],
            };

            const vacancy = {
              ...mockVacancy,
              matchScore: scores.locationScore,
              requirements: ['skill1'],
              skills: ['tech1'],
            };

            candidatesService.obtenerCandidato.mockResolvedValue(candidate);
            vacanciesService.buscarCercanas.mockResolvedValue([vacancy]);
            categoryVacancyService.getCategoriesForVacancy.mockResolvedValue([]);

            const result = await service.findMatchesForCandidate('candidate-1', {
              enableDetailedMatching: true,
            });

            if (result.length > 0) {
              const match = result[0];
              
              // All scores should be bounded
              expect(match.score).toBeGreaterThanOrEqual(0);
              expect(match.score).toBeLessThanOrEqual(100);
              
              if (match.matchFactors) {
                expect(match.matchFactors.locationScore).toBeGreaterThanOrEqual(0);
                expect(match.matchFactors.locationScore).toBeLessThanOrEqual(100);
                expect(match.matchFactors.categoryScore).toBeGreaterThanOrEqual(0);
                expect(match.matchFactors.categoryScore).toBeLessThanOrEqual(100);
                expect(match.matchFactors.experienceScore).toBeGreaterThanOrEqual(0);
                expect(match.matchFactors.experienceScore).toBeLessThanOrEqual(100);
                expect(match.matchFactors.skillsScore).toBeGreaterThanOrEqual(0);
                expect(match.matchFactors.skillsScore).toBeLessThanOrEqual(100);
                expect(match.matchFactors.overallScore).toBeGreaterThanOrEqual(0);
                expect(match.matchFactors.overallScore).toBeLessThanOrEqual(100);
              }
              
              // Color mapping should be consistent
              if (match.score >= 90) {
                expect(match.color).toBe('green');
              } else if (match.score >= 70) {
                expect(match.color).toBe('yellow');
              } else {
                expect(match.color).toBe('red');
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});