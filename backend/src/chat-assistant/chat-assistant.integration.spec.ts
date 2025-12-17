import { Test, TestingModule } from '@nestjs/testing';
import { ChatAssistantController } from './chat-assistant.controller';
import { ChatAssistantService } from './chat-assistant.service';
import { CategoriesService } from '../categories/categories.service';

describe('ChatAssistantController Integration', () => {
  let controller: ChatAssistantController;
  let service: ChatAssistantService;
  let categoriesService: CategoriesService;

  const mockCategoriesService = {
    searchCategoriesAdvanced: jest.fn(),
  };

  const mockFirebaseApp = {
    firestore: jest.fn(() => ({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: jest.fn(),
          set: jest.fn(),
        })),
      })),
    })),
    storage: jest.fn(() => ({
      bucket: jest.fn(),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatAssistantController],
      providers: [
        ChatAssistantService,
        {
          provide: CategoriesService,
          useValue: mockCategoriesService,
        },
        {
          provide: 'FIREBASE_ADMIN',
          useValue: mockFirebaseApp,
        },
      ],
    }).compile();

    controller = module.get<ChatAssistantController>(ChatAssistantController);
    service = module.get<ChatAssistantService>(ChatAssistantService);
    categoriesService = module.get<CategoriesService>(CategoriesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  describe('analyzeProfile', () => {
    it('should return profile analysis', async () => {
      const userId = 'test-user-id';
      
      // Mock the service method
      jest.spyOn(service, 'analyzeProfileData').mockResolvedValue({
        objective: 'Test objective',
        experience: [],
        skills: { technical: [], soft: [], languages: [] },
        education: [],
        suggestedCategories: [],
        completenessScore: 50,
      });

      const result = await controller.analyzeProfile(userId);

      expect(result.ok).toBe(true);
      expect(result.analysis).toBeDefined();
      expect(result.analysis.objective).toBe('Test objective');
    });
  });

  describe('getSmartQuestions', () => {
    it('should return smart questions', async () => {
      const userId = 'test-user-id';
      
      // Mock the service method
      jest.spyOn(service, 'generateSmartQuestions').mockResolvedValue([
        '¿En qué área te gustaría trabajar?',
        '¿Podrías contarme sobre tu experiencia laboral?'
      ]);

      const result = await controller.getSmartQuestions(userId);

      expect(result.ok).toBe(true);
      expect(result.questions).toBeDefined();
      expect(result.questions).toHaveLength(2);
    });
  });

  describe('suggestCategories', () => {
    it('should suggest categories based on profile responses', async () => {
      // Mock categories service
      mockCategoriesService.searchCategoriesAdvanced.mockResolvedValue({
        categories: [
          { id: 'tech-1', name: 'tecnología' },
          { id: 'sales-1', name: 'ventas' },
          { id: 'admin-1', name: 'administración' },
        ],
        total: 3,
      });

      const mockResponses = {
        1: { respuesta: 'Soy desarrollador de software con experiencia en JavaScript' },
        2: { respuesta: 'He trabajado en programación y desarrollo web' },
      };

      // Test the private method through the service
      const result = await service['suggestCategories'](mockResponses);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});