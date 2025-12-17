// backend/src/unified-email/no-profile-handling.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import * as fc from 'fast-check';
import { RoleManagerService } from './services/role-manager.service';
import { UnifiedAuthService } from './services/unified-auth.service';

/**
 * Property Test 4.4: No-profile user handling
 * Validates: Requirements 3.5
 * 
 * Property: Users without any profiles should be properly handled and directed
 * to profile creation flows.
 */

describe('RoleManagerService - No-Profile Handling Properties', () => {
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
   * Property 11: No-profile user handling
   */
  it('should handle users with no profiles correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }), // userId
        async (userId) => {
          // Mock user with no profiles
          (authService.checkUserProfiles as jest.Mock).mockResolvedValue({
            availableRoles: [],
            hasCandidate: false,
            hasCompany: false
          });

          (authService.getUnifiedUserAccount as jest.Mock).mockResolvedValue({
            uid: userId,
            email: 'test@example.com',
            profileTypes: [],
            preferences: {
              roleSelectionPreference: 'ask'
            }
          });

          // Act
          const result = await service.determineLoginRole(userId);

          // Assert: Should indicate no profiles available
          expect(result.availableRoles).toEqual([]);
          expect(result.recommendedRole).toBeNull();
          expect(result.requiresSelection).toBe(true);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should reject role switching for users without profiles', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }), // userId
        fc.constantFrom('candidate', 'company'), // attemptedRole
        async (userId, attemptedRole) => {
          // Mock user with no profiles
          (authService.checkUserProfiles as jest.Mock).mockResolvedValue({
            availableRoles: [],
            hasCandidate: false,
            hasCompany: false
          });

          // Act & Assert: Should throw error when trying to switch to unavailable role
          await expect(
            service.switchRole(userId, attemptedRole as any)
          ).rejects.toThrow();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should reject routing requests for users without profiles', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }), // userId
        fc.constantFrom('candidate', 'company'), // requestedRole
        async (userId, requestedRole) => {
          // Mock user with no profiles
          (authService.checkUserProfiles as jest.Mock).mockResolvedValue({
            availableRoles: [],
            hasCandidate: false,
            hasCompany: false
          });

          // Act & Assert: Should throw error when requesting routing for unavailable role
          await expect(
            service.getRoleBasedRouting(userId, requestedRole as any)
          ).rejects.toThrow();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should handle single profile creation correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }), // userId
        fc.constantFrom('candidate', 'company'), // profileType
        async (userId, profileType) => {
          // First call: no profiles
          (authService.checkUserProfiles as jest.Mock)
            .mockResolvedValueOnce({
              availableRoles: [],
              hasCandidate: false,
              hasCompany: false
            })
            // Second call: after profile creation
            .mockResolvedValueOnce({
              availableRoles: [profileType],
              hasCandidate: profileType === 'candidate',
              hasCompany: profileType === 'company'
            });

          (authService.getUnifiedUserAccount as jest.Mock).mockResolvedValue({
            uid: userId,
            email: 'test@example.com',
            profileTypes: [profileType],
            preferences: {
              roleSelectionPreference: 'ask'
            }
          });

          // Act: Check initial state (no profiles)
          const initialResult = await service.determineLoginRole(userId);
          expect(initialResult.availableRoles).toEqual([]);
          expect(initialResult.recommendedRole).toBeNull();

          // Act: Check after profile creation
          const afterCreationResult = await service.determineLoginRole(userId);
          expect(afterCreationResult.availableRoles).toEqual([profileType]);
          expect(afterCreationResult.recommendedRole).toBe(profileType);
          expect(afterCreationResult.requiresSelection).toBe(false);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should maintain session integrity when transitioning from no profiles to having profiles', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }), // userId
        fc.constantFrom('candidate', 'company'), // newProfileType
        async (userId, newProfileType) => {
          // Mock no existing session initially
          mockFirebase.firestore().collection().doc().get
            .mockResolvedValueOnce({ exists: false })
            .mockResolvedValueOnce({ exists: false });
          
          mockFirebase.firestore().collection().doc().set.mockResolvedValue(undefined);

          // Mock profile creation
          (authService.checkUserProfiles as jest.Mock).mockResolvedValue({
            availableRoles: [newProfileType],
            hasCandidate: newProfileType === 'candidate',
            hasCompany: newProfileType === 'company'
          });

          // Act: Create first session with new profile
          const session = await service.switchRole(userId, newProfileType as any);

          // Assert: Session should be created correctly
          expect(session.userId).toBe(userId);
          expect(session.activeRole).toBe(newProfileType);
          expect(session.sessionData.roleHistory).toEqual([]);
          expect(session.previousRole).toBeUndefined();
        }
      ),
      { numRuns: 20 }
    );
  });
});