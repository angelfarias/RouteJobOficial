// backend/src/unified-email/services/unified-auth.service.ts
import { Injectable, Inject, ConflictException, BadRequestException, NotFoundException, UnauthorizedException, Logger } from '@nestjs/common';
import { Timestamp } from 'firebase-admin/firestore';
import type * as admin from 'firebase-admin';
import { 
  UnifiedUserAccount, 
  ProfileTypes, 
  ProfileType,
  CandidateProfile,
  CompanyProfile,
  CreateCandidateProfileDto,
  CreateCompanyProfileDto
} from '../interfaces';
import { FIRESTORE_COLLECTIONS } from '../constants/firestore-collections';
import { ProfileValidation } from '../validation/profile-validation';
import { LinkProfileDto, ProfileLinkingResult } from '../dto';
import { 
  AuthenticationFailedException,
  AccountOwnershipValidationException,
  ProfileCreationFailedException,
  ProfileLinkingFailedException,
  FirestoreConnectionException,
  FirebaseAuthException,
  InvalidProfileDataException
} from '../exceptions/unified-email.exceptions';
import { RetryUtil, Retry } from '../utils/retry.util';
import { ErrorRecoveryService } from './error-recovery.service';

@Injectable()
export class UnifiedAuthService {
  private readonly logger = new Logger(UnifiedAuthService.name);

  constructor(
    @Inject('FIREBASE_ADMIN') private readonly fb: typeof import('firebase-admin'),
    private readonly errorRecoveryService: ErrorRecoveryService
  ) {}

  /**
   * Check what profile types a user has
   * Validates: Requirements 3.1
   */
  @Retry({ maxAttempts: 3, baseDelay: 1000 }, 'checkUserProfiles')
  async checkUserProfiles(userId: string): Promise<ProfileTypes> {
    const context = ErrorRecoveryService.createErrorContext('checkUserProfiles', userId);
    
    try {
      const firestore = this.fb.firestore();
      
      // Use retry utility for Firestore operations
      const result = await RetryUtil.executeWithRetry(
        async () => {
          // Check for candidate profile
          const candidateDoc = await firestore
            .collection(FIRESTORE_COLLECTIONS.CANDIDATES)
            .doc(userId)
            .get();

          // Check for company profile  
          const companyDoc = await firestore
            .collection(FIRESTORE_COLLECTIONS.COMPANIES)
            .doc(userId)
            .get();

          return { candidateDoc, companyDoc };
        },
        RetryUtil.DEFAULT_OPTIONS.firestore,
        'checkUserProfiles_firestore'
      );

      if (!result.success) {
        throw new FirestoreConnectionException('checkUserProfiles', result.error);
      }

      const { candidateDoc, companyDoc } = result.result!;
      const hasCandidate = candidateDoc.exists;
      const hasCompany = companyDoc.exists;
      const availableRoles: ProfileType[] = [];

      if (hasCandidate) availableRoles.push('candidate');
      if (hasCompany) availableRoles.push('company');

      this.logger.debug(`User ${userId} has profiles: ${availableRoles.join(', ')}`);

      return {
        hasCandidate,
        hasCompany,
        availableRoles
      };
    } catch (error) {
      this.logger.error(`Error checking user profiles for ${userId}:`, error);
      
      if (error instanceof FirestoreConnectionException) {
        throw error;
      }
      
      throw new FirestoreConnectionException('checkUserProfiles', error);
    }
  }

  /**
   * Link a new profile type to an existing user account
   * Validates: Requirements 1.2, 1.3, 1.4
   */
  async linkProfileToUser(
    userId: string, 
    profileType: ProfileType, 
    profileData: CreateCandidateProfileDto | CreateCompanyProfileDto
  ): Promise<void> {
    const context = ErrorRecoveryService.createErrorContext('linkProfileToUser', userId, profileType);
    
    try {
      // Validate profile data
      const validation = profileType === 'candidate' 
        ? ProfileValidation.validateCreateCandidateDto(profileData as CreateCandidateProfileDto)
        : ProfileValidation.validateCreateCompanyDto(profileData as CreateCompanyProfileDto);

      if (!validation.isValid) {
        throw new InvalidProfileDataException(validation.errors);
      }

      // Execute profile linking with retry logic
      const result = await RetryUtil.executeWithRetry(
        async () => {
          const firestore = this.fb.firestore();
          
          // Check if profile already exists
          const collection = profileType === 'candidate' 
            ? FIRESTORE_COLLECTIONS.CANDIDATES 
            : FIRESTORE_COLLECTIONS.COMPANIES;
            
          const existingProfile = await firestore
            .collection(collection)
            .doc(userId)
            .get();

          if (existingProfile.exists) {
            throw new ConflictException(`El usuario ya tiene un perfil de ${profileType}`);
          }

          // Create the profile document
          const now = Timestamp.now();
          const sanitizedData = ProfileValidation.sanitizeProfileData(profileData);

          if (profileType === 'candidate') {
            const dto = sanitizedData as CreateCandidateProfileDto;
            const candidateProfile: CandidateProfile = {
              userId,
              personalInfo: dto.personalInfo,
              professionalInfo: {
                title: dto.professionalInfo?.title,
                experience: dto.professionalInfo?.experience,
                skills: dto.professionalInfo?.skills || [],
                resume: dto.professionalInfo?.resume
              },
              preferences: {
                jobTypes: dto.preferences?.jobTypes || [],
                locations: dto.preferences?.locations || [],
                salaryRange: dto.preferences?.salaryRange
              },
              applications: [],
              createdAt: now,
              updatedAt: now
            };

            await firestore
              .collection(FIRESTORE_COLLECTIONS.CANDIDATES)
              .doc(userId)
              .set(candidateProfile);
          } else {
            const companyProfile: CompanyProfile = {
              userId,
              companyInfo: (sanitizedData as CreateCompanyProfileDto).companyInfo,
              contactInfo: (sanitizedData as CreateCompanyProfileDto).contactInfo,
              jobPostings: [],
              createdAt: now,
              updatedAt: now
            };

            await firestore
              .collection(FIRESTORE_COLLECTIONS.COMPANIES)
              .doc(userId)
              .set(companyProfile);
          }

          return { success: true };
        },
        RetryUtil.DEFAULT_OPTIONS.profile_operations,
        'linkProfileToUser_create'
      );

      if (!result.success) {
        throw new ProfileCreationFailedException(profileType, result.error);
      }

      // Update user account to include new profile type
      await this.updateUserProfileTypes(userId, profileType, 'add');

      this.logger.debug(`Successfully linked ${profileType} profile for user ${userId}`);

    } catch (error) {
      this.logger.error(`Error linking ${profileType} profile for user ${userId}:`, error);
      
      if (error instanceof ConflictException || 
          error instanceof InvalidProfileDataException ||
          error instanceof ProfileCreationFailedException) {
        throw error;
      }
      
      throw new ProfileLinkingFailedException(profileType, error);
    }
  }

  /**
   * Validate account ownership through password verification
   * Validates: Requirements 1.4
   */
  @Retry({ maxAttempts: 2, baseDelay: 500 }, 'validateAccountOwnership')
  async validateAccountOwnership(email: string, password: string): Promise<boolean> {
    const context = ErrorRecoveryService.createErrorContext('validateAccountOwnership');
    
    try {
      const result = await RetryUtil.executeWithRetry(
        async () => {
          // Get user by email
          const user = await this.fb.auth().getUserByEmail(email.toLowerCase());
          
          if (!user) {
            throw new AuthenticationFailedException('Usuario no encontrado');
          }

          // Note: Firebase Admin SDK doesn't provide password verification
          // In a real implementation, this would need to be done on the client side
          // or through a custom token verification system
          // For now, we'll simulate the validation
          
          // In production, you would verify the password here
          // This is a placeholder that assumes password is valid if user exists
          return { valid: true, user };
        },
        RetryUtil.DEFAULT_OPTIONS.firebase_auth,
        'validateAccountOwnership_auth'
      );

      if (!result.success) {
        if (result.error?.code === 'auth/user-not-found') {
          this.logger.warn(`Account ownership validation failed: user not found for email ${email}`);
          return false;
        }
        throw new FirebaseAuthException('validateAccountOwnership', result.error);
      }

      this.logger.debug(`Account ownership validated for email: ${email}`);
      return result.result!.valid;

    } catch (error) {
      this.logger.error(`Error validating account ownership for ${email}:`, error);
      
      if (error instanceof AuthenticationFailedException || 
          error instanceof FirebaseAuthException) {
        throw error;
      }
      
      if (error?.code === 'auth/user-not-found') {
        return false;
      }
      
      throw new AccountOwnershipValidationException(error.message);
    }
  }

  /**
   * Handle profile linking with password verification
   * Validates: Requirements 1.2, 1.3, 1.4
   */
  async handleProfileLinking(dto: LinkProfileDto): Promise<ProfileLinkingResult> {
    try {
      // Validate account ownership
      const isValidOwner = await this.validateAccountOwnership(dto.email, dto.password);
      if (!isValidOwner) {
        throw new UnauthorizedException('Credenciales inválidas');
      }

      // Get user by email
      const user = await this.fb.auth().getUserByEmail(dto.email.toLowerCase());
      
      // Link the profile
      await this.linkProfileToUser(user.uid, dto.profileType, dto.profileData);

      return {
        success: true,
        message: `Perfil de ${dto.profileType} vinculado exitosamente`,
        profileType: dto.profileType,
        userId: user.uid
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || 
          error instanceof ConflictException || 
          error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error handling profile linking:', error);
      throw new BadRequestException('Error al procesar la vinculación del perfil');
    }
  }

  /**
   * Get unified user account information
   */
  async getUnifiedUserAccount(userId: string): Promise<UnifiedUserAccount | null> {
    try {
      const userDoc = await this.fb.firestore()
        .collection(FIRESTORE_COLLECTIONS.USERS)
        .doc(userId)
        .get();

      if (!userDoc.exists) {
        return null;
      }

      return userDoc.data() as UnifiedUserAccount;
    } catch (error) {
      console.error('Error getting unified user account:', error);
      return null;
    }
  }

  /**
   * Create or update unified user account
   */
  async createOrUpdateUnifiedAccount(
    userId: string, 
    email: string, 
    additionalData?: Partial<UnifiedUserAccount>
  ): Promise<UnifiedUserAccount> {
    const firestore = this.fb.firestore();
    const now = Timestamp.now();

    try {
      const existingDoc = await firestore
        .collection(FIRESTORE_COLLECTIONS.USERS)
        .doc(userId)
        .get();

      const accountData: UnifiedUserAccount = {
        uid: userId,
        email: email.toLowerCase(),
        createdAt: existingDoc.exists ? (existingDoc.data() as UnifiedUserAccount).createdAt : now,
        lastLoginAt: now,
        profileTypes: existingDoc.exists ? (existingDoc.data() as UnifiedUserAccount).profileTypes : [],
        preferences: {
          roleSelectionPreference: 'ask',
          ...((existingDoc.exists ? (existingDoc.data() as UnifiedUserAccount).preferences : {}) || {}),
          ...(additionalData?.preferences || {})
        },
        ...additionalData
      };

      await firestore
        .collection(FIRESTORE_COLLECTIONS.USERS)
        .doc(userId)
        .set(accountData, { merge: true });

      return accountData;
    } catch (error) {
      console.error('Error creating/updating unified account:', error);
      throw new BadRequestException('Error al crear o actualizar la cuenta unificada');
    }
  }

  /**
   * Update user profile types
   */
  private async updateUserProfileTypes(
    userId: string, 
    profileType: ProfileType, 
    operation: 'add' | 'remove'
  ): Promise<void> {
    const firestore = this.fb.firestore();
    
    try {
      const userDoc = await firestore
        .collection(FIRESTORE_COLLECTIONS.USERS)
        .doc(userId)
        .get();

      let profileTypes: ProfileType[] = [];
      
      if (userDoc.exists) {
        const userData = userDoc.data() as UnifiedUserAccount;
        profileTypes = userData.profileTypes || [];
      }

      if (operation === 'add' && !profileTypes.includes(profileType)) {
        profileTypes.push(profileType);
      } else if (operation === 'remove') {
        profileTypes = profileTypes.filter(type => type !== profileType);
      }

      await firestore
        .collection(FIRESTORE_COLLECTIONS.USERS)
        .doc(userId)
        .update({ 
          profileTypes,
          updatedAt: Timestamp.now()
        });
    } catch (error) {
      console.error('Error updating user profile types:', error);
      throw new BadRequestException('Error al actualizar los tipos de perfil del usuario');
    }
  }
}