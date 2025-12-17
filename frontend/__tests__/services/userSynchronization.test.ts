import { UserSynchronizationService } from '@/lib/services/userSynchronizationService';

// Mock Firebase
jest.mock('@/lib/firebaseClient', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
  serverTimestamp: jest.fn(() => ({ seconds: Date.now() / 1000 })),
}));

describe('UserSynchronizationService', () => {
  let service: UserSynchronizationService;
  
  beforeEach(() => {
    service = UserSynchronizationService.getInstance();
  });

  it('should create a singleton instance', () => {
    const instance1 = UserSynchronizationService.getInstance();
    const instance2 = UserSynchronizationService.getInstance();
    
    expect(instance1).toBe(instance2);
  });

  it('should verify candidate profile exists method', async () => {
    // Mock user ID
    const userId = 'test-user-123';
    
    // Mock getDoc to return exists: true
    const { getDoc } = require('firebase/firestore');
    getDoc.mockResolvedValue({ exists: () => true });
    
    const exists = await service.verifyCandidateExists(userId);
    expect(exists).toBe(true);
  });

  it('should handle candidate profile creation', async () => {
    const mockUser = {
      uid: 'test-user-123',
      email: 'test@example.com',
      displayName: 'Test User'
    };

    const { setDoc } = require('firebase/firestore');
    setDoc.mockResolvedValue(undefined);

    const profile = await service.createCandidateProfile(mockUser as any, 'registration');
    
    expect(profile.uid).toBe(mockUser.uid);
    expect(profile.email).toBe(mockUser.email);
    expect(profile.displayName).toBe(mockUser.displayName);
    expect(profile.profileCompleted).toBe(false);
    expect(profile.syncMetadata?.creationSource).toBe('registration');
    expect(profile.experience).toEqual([]);
    expect(profile.skills).toEqual([]);
  });
});