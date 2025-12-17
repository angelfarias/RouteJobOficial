// backend/src/unified-email/multi-profile-handling.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import * as fc from 'fast-check';
import { RoleManagerService } from './services/role-manager.service';
import { UnifiedAuthService } from './services/unified-auth.service';
import { ProfileType, RoleSelectionPreference } from './interfaces';

/**
 * Property Test 4.3: Multi-profile user handling
 * Validates: Requirements 3.4
 * 
 * Property: Users with multiple profiles should be able to switch between them
 * and receive appropriate role recommendations based on their preferences.
 */

describe('RoleManagerService - Multi-Profile Handling Properties', () => {
  let service: RoleManagerService;
  let authService: UnifiedAuthService;
  let mockFirebase: any;

  beforeEach(async () => {
    // Mock Firebase Admin
    mockFirebase = {
      firestore: jest.fn(() => ({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            get: jest.fn(),
            set: jest.fn(),
            update: jest.fn()
          }))
        }))
      }))
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleManagerService,
        {
          provide: UnifiedAuthService,
          useValue: {
            checkUserProfiles: jest.fn(),
            getUnifiedUserAccount: jest.fn()
          }
        },
        {
          provide: 'FIREBASE_ADMIN',
          useValue: mockFirebase
        }
      ]
    }).compile();

    service = module.get<RoleManagerService>(RoleManagerService);
    authService = module.get<UnifiedAuthService>(UnifiedAuthService);
  });

  /**
   * Property 10: Multi-profile user handling
   */
  it('should handle users with multiple profiles correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }), // userId
        fc.constantFrom('ask', 'candidate', 'company'), // preference
        async (userId, preference) => {
          // Mock user with both profiles
          (authService.checkUserProfiles as jest.Mock).mockResolvedValue({
            availableRoles: ['candidate', 'company'],
            hasCandidate: true,
            hasCompany: true
          });

          // Mock user account with preference
          (authService.getUnifiedUserAccount as jest.Mock).mockResolvedValue({
            uid: userId,
            email: 'test@example.com',
            profileTypes: ['candidate', 'company'],
            preferences: {
              roleSelectionPreference: preference as RoleSelectionPreference
            }
          });

          // Act
          const result = await service.determineLoginRole(userId);

          // Assert: Should return both available roles
          expect(result.availableRoles).toEqual(['candidate', 'company']);

          // Assert: Recommendation should follow preference
          if (preference === 'candidate') {
            expect(result.recommendedRole).toBe('candidate');
            expect(result.requiresSelection).toBe(false);
          } else if (preference === 'company') {
            expect(result.recommendedRole).toBe('company');
            expect(result.requiresSelection).toBe(false);
          } else {
            // 'ask' preference should require selection
            expect(result.requiresSelection).toBe(true);
            expect(['candidate', 'company']).toContain(result.recommendedRole);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should allow switching between available profiles', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }), // userId
        fc.constantFrom('candidate', 'company'), // fromRole
        fc.constantFrom('candidate', 'company'), // toRole
        async (userId, fromRole, toRole) => {
          // Mock user with both profiles
          (authService.checkUserProfiles as jest.Mock).mockResolvedValue({
            availableRoles: ['candidate', 'company'],
            hasCandidate: true,
            hasCompany: true
          });

          // Mock existing session
          const mockDoc = {
            exists: true,
            data: () => ({
              userId,
              activeRole: fromRole,
              createdAt: { toMillis: () => Date.now() - 3600000 },
              lastActivity: { toMillis: () => Date.now() - 1000 },
              roleChangedAt: { toMillis: () => Date.now() - 1800000 },
              sessionData: {
                roleHistory: [],
                preferences: {},
                navigationState: {}
              }
            })
          };

          mockFirebase.firestore().collection().doc().get.mockResolvedValue(mockDoc);
          mockFirebase.firestore().collection().doc().set.mockResolvedValue(undefined);

          // Act
          const result = await service.switchRole(userId, toRole as ProfileType);

          // Assert: Should successfully switch to target role
          expect(result.activeRole).toBe(toRole);
          expect(result.userId).toBe(userId);

          if (fromRole !== toRole) {
            expect(result.previousRole).toBe(fromRole);
          }
        }
      ),
      { numRuns: 40 }
    );
  });

  it('should maintain preference consistency across sessions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }), // userId
        fc.constantFrom('ask', 'candidate', 'company'), // initialPreference
        fc.constantFrom('ask', 'candidate', 'company'), // updatedPreference
        async (userId, initialPreference, updatedPreference) => {
          // Mock Firestore update
          mockFirebase.firestore().collection().doc().update.mockResolvedValue(undefined);

          // Act: Update preference
          await service.updateRolePreference(userId, updatedPreference as RoleSelectionPreference);

          // Mock updated user account
          (authService.getUnifiedUserAccount as jest.Mock).mockResolvedValue({
            uid: userId,
            email: 'test@example.com',
            profileTypes: ['candidate', 'company'],
            preferences: {
              roleSelectionPreference: updatedPreference as RoleSelectionPreference
            }
          });

          (authService.checkUserProfiles as jest.Mock).mockResolvedValue({
            availableRoles: ['candidate', 'company'],
            hasCandidate: true,
            hasCompany: true
          });

          // Act: Determine login role with updated preference
          const result = await service.determineLoginRole(userId);

          // Assert: Should respect updated preference
          if (updatedPreference === 'candidate') {
            expect(result.recommendedRole).toBe('candidate');
            expect(result.requiresSelection).toBe(false);
          } else if (updatedPreference === 'company') {
            expect(result.recommendedRole).toBe('company');
            expect(result.requiresSelection).toBe(false);
          } else {
            expect(result.requiresSelection).toBe(true);
          }
        }
      ),
      { numRuns: 30 }
    );
  });
});