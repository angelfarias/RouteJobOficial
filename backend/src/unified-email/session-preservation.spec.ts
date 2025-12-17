// backend/src/unified-email/session-preservation.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import * as fc from 'fast-check';
import { RoleManagerService } from './services/role-manager.service';
import { UnifiedAuthService } from './services/unified-auth.service';
import { ProfileType, UserSession } from './interfaces';

/**
 * Property Test 4.1: Session preservation during role switching
 * Validates: Requirements 2.4
 * 
 * Property: When a user switches roles, their session data should be preserved
 * and the role history should be updated correctly.
 */

describe('RoleManagerService - Session Preservation Properties', () => {
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
            update: jest.fn(),
            delete: jest.fn()
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
   * Property 6: Session preservation during role switching
   */
  it('should preserve session data when switching roles', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }), // userId
        fc.constantFrom('candidate', 'company'), // fromRole
        fc.constantFrom('candidate', 'company'), // toRole
        fc.record({
          preferences: fc.dictionary(fc.string(), fc.anything()),
          navigationState: fc.dictionary(fc.string(), fc.anything()),
          roleHistory: fc.array(fc.record({
            role: fc.constantFrom('candidate', 'company'),
            timestamp: fc.anything(),
            duration: fc.integer({ min: 0 })
          }))
        }), // sessionData
        async (userId, fromRole, toRole, sessionData) => {
          // Skip if switching to same role
          fc.pre(fromRole !== toRole);

          // Mock existing session
          const existingSession: UserSession = {
            userId,
            activeRole: fromRole as ProfileType,
            createdAt: { toMillis: () => Date.now() - 3600000 } as any,
            lastActivity: { toMillis: () => Date.now() - 1000 } as any,
            roleChangedAt: { toMillis: () => Date.now() - 1800000 } as any,
            sessionData
          };

          // Mock Firestore responses
          const mockDoc = {
            exists: true,
            data: () => existingSession
          };

          mockFirebase.firestore().collection().doc().get.mockResolvedValue(mockDoc);
          mockFirebase.firestore().collection().doc().set.mockResolvedValue(undefined);

          // Mock auth service
          (authService.checkUserProfiles as jest.Mock).mockResolvedValue({
            availableRoles: [fromRole, toRole],
            hasCandidate: true,
            hasCompany: true
          });

          // Act
          const result = await service.switchRole(userId, toRole as ProfileType);

          // Assert: Session data should be preserved
          expect(result.sessionData.preferences).toEqual(sessionData.preferences);
          expect(result.sessionData.navigationState).toEqual(sessionData.navigationState);
          
          // Assert: Role history should be updated
          expect(result.sessionData.roleHistory).toHaveLength(sessionData.roleHistory.length + 1);
          
          // Assert: Previous role should be recorded
          expect(result.previousRole).toBe(fromRole);
          expect(result.activeRole).toBe(toRole);

          // Assert: New role history entry should be added
          const newHistoryEntry = result.sessionData.roleHistory[result.sessionData.roleHistory.length - 1];
          expect(newHistoryEntry.role).toBe(fromRole);
          expect(typeof newHistoryEntry.duration).toBe('number');
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should create new session if none exists', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }), // userId
        fc.constantFrom('candidate', 'company'), // role
        async (userId, role) => {
          // Mock no existing session
          const mockDoc = {
            exists: false,
            data: () => null
          };

          mockFirebase.firestore().collection().doc().get.mockResolvedValue(mockDoc);
          mockFirebase.firestore().collection().doc().set.mockResolvedValue(undefined);

          // Mock auth service
          (authService.checkUserProfiles as jest.Mock).mockResolvedValue({
            availableRoles: [role],
            hasCandidate: role === 'candidate',
            hasCompany: role === 'company'
          });

          // Act
          const result = await service.switchRole(userId, role as ProfileType);

          // Assert: New session should be created
          expect(result.userId).toBe(userId);
          expect(result.activeRole).toBe(role);
          expect(result.sessionData.roleHistory).toEqual([]);
          expect(result.previousRole).toBeUndefined();
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should maintain session integrity across multiple role switches', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }), // userId
        fc.array(fc.constantFrom('candidate', 'company'), { minLength: 2, maxLength: 5 }), // roleSequence
        async (userId, roleSequence) => {
          let currentSession: UserSession | null = null;
          
          for (let i = 0; i < roleSequence.length; i++) {
            const role = roleSequence[i] as ProfileType;
            
            // Mock session state
            const mockDoc = {
              exists: currentSession !== null,
              data: () => currentSession
            };

            mockFirebase.firestore().collection().doc().get.mockResolvedValue(mockDoc);
            mockFirebase.firestore().collection().doc().set.mockImplementation((data) => {
              currentSession = data;
              return Promise.resolve();
            });

            // Mock auth service
            (authService.checkUserProfiles as jest.Mock).mockResolvedValue({
              availableRoles: ['candidate', 'company'],
              hasCandidate: true,
              hasCompany: true
            });

            // Act
            const result = await service.switchRole(userId, role);
            
            // Assert: Session should maintain integrity
            expect(result.userId).toBe(userId);
            expect(result.activeRole).toBe(role);
            expect(result.sessionData.roleHistory.length).toBe(i);
            
            if (i > 0) {
              expect(result.previousRole).toBe(roleSequence[i - 1]);
            }
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});