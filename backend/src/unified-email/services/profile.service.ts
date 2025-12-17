// backend/src/unified-email/services/profile.service.ts
import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { Timestamp } from 'firebase-admin/firestore';
import type * as admin from 'firebase-admin';
import {
  CandidateProfile,
  CompanyProfile,
  CreateCandidateProfileDto,
  CreateCompanyProfileDto,
  UpdateCandidateProfileDto,
  UpdateCompanyProfileDto,
  ProfileType
} from '../interfaces';
import { FIRESTORE_COLLECTIONS } from '../constants/firestore-collections';
import { ProfileValidation } from '../validation/profile-validation';

@Injectable()
export class ProfileService {
  constructor(@Inject('FIREBASE_ADMIN') private readonly fb: typeof import('firebase-admin')) {}

  /**
   * Create a new candidate profile
   * Validates: Requirements 4.2
   */
  async createCandidateProfile(userId: string, data: CreateCandidateProfileDto): Promise<CandidateProfile> {
    const firestore = this.fb.firestore();

    try {
      // Validate input data
      const validation = ProfileValidation.validateCreateCandidateDto(data);
      if (!validation.isValid) {
        throw new BadRequestException(`Datos de perfil inválidos: ${validation.errors.join(', ')}`);
      }

      // Check if profile already exists
      const existingProfile = await firestore
        .collection(FIRESTORE_COLLECTIONS.CANDIDATES)
        .doc(userId)
        .get();

      if (existingProfile.exists) {
        throw new BadRequestException('El usuario ya tiene un perfil de candidato');
      }

      // Sanitize and create profile
      const sanitizedData = ProfileValidation.sanitizeProfileData(data);
      const now = Timestamp.now();

      const candidateProfile: CandidateProfile = {
        userId,
        personalInfo: sanitizedData.personalInfo,
        professionalInfo: {
          title: sanitizedData.professionalInfo?.title,
          experience: sanitizedData.professionalInfo?.experience,
          skills: sanitizedData.professionalInfo?.skills || [],
          resume: sanitizedData.professionalInfo?.resume
        },
        preferences: {
          jobTypes: sanitizedData.preferences?.jobTypes || [],
          locations: sanitizedData.preferences?.locations || [],
          salaryRange: sanitizedData.preferences?.salaryRange
        },
        applications: [],
        createdAt: now,
        updatedAt: now
      };

      // Save to Firestore
      await firestore
        .collection(FIRESTORE_COLLECTIONS.CANDIDATES)
        .doc(userId)
        .set(candidateProfile);

      return candidateProfile;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error creating candidate profile:', error);
      throw new BadRequestException('Error al crear el perfil de candidato');
    }
  }

  /**
   * Create a new company profile
   * Validates: Requirements 4.2
   */
  async createCompanyProfile(userId: string, data: CreateCompanyProfileDto): Promise<CompanyProfile> {
    const firestore = this.fb.firestore();

    try {
      // Validate input data
      const validation = ProfileValidation.validateCreateCompanyDto(data);
      if (!validation.isValid) {
        throw new BadRequestException(`Datos de perfil inválidos: ${validation.errors.join(', ')}`);
      }

      // Check if profile already exists
      const existingProfile = await firestore
        .collection(FIRESTORE_COLLECTIONS.COMPANIES)
        .doc(userId)
        .get();

      if (existingProfile.exists) {
        throw new BadRequestException('El usuario ya tiene un perfil de empresa');
      }

      // Sanitize and create profile
      const sanitizedData = ProfileValidation.sanitizeProfileData(data);
      const now = Timestamp.now();

      const companyProfile: CompanyProfile = {
        userId,
        companyInfo: sanitizedData.companyInfo,
        contactInfo: sanitizedData.contactInfo,
        jobPostings: [],
        createdAt: now,
        updatedAt: now
      };

      // Save to Firestore
      await firestore
        .collection(FIRESTORE_COLLECTIONS.COMPANIES)
        .doc(userId)
        .set(companyProfile);

      return companyProfile;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error creating company profile:', error);
      throw new BadRequestException('Error al crear el perfil de empresa');
    }
  }

  /**
   * Get candidate profile by user ID
   */
  async getCandidateProfile(userId: string): Promise<CandidateProfile | null> {
    try {
      const doc = await this.fb.firestore()
        .collection(FIRESTORE_COLLECTIONS.CANDIDATES)
        .doc(userId)
        .get();

      if (!doc.exists) {
        return null;
      }

      return doc.data() as CandidateProfile;
    } catch (error) {
      console.error('Error getting candidate profile:', error);
      throw new BadRequestException('Error al obtener el perfil de candidato');
    }
  }

  /**
   * Get company profile by user ID
   */
  async getCompanyProfile(userId: string): Promise<CompanyProfile | null> {
    try {
      const doc = await this.fb.firestore()
        .collection(FIRESTORE_COLLECTIONS.COMPANIES)
        .doc(userId)
        .get();

      if (!doc.exists) {
        return null;
      }

      return doc.data() as CompanyProfile;
    } catch (error) {
      console.error('Error getting company profile:', error);
      throw new BadRequestException('Error al obtener el perfil de empresa');
    }
  }

  /**
   * Update candidate profile
   * Validates: Requirements 4.3
   */
  async updateCandidateProfile(userId: string, data: UpdateCandidateProfileDto): Promise<CandidateProfile> {
    const firestore = this.fb.firestore();

    try {
      // Get existing profile
      const existingDoc = await firestore
        .collection(FIRESTORE_COLLECTIONS.CANDIDATES)
        .doc(userId)
        .get();

      if (!existingDoc.exists) {
        throw new NotFoundException('Perfil de candidato no encontrado');
      }

      const existingProfile = existingDoc.data() as CandidateProfile;

      // Merge and validate updated data
      const updatedProfile: CandidateProfile = {
        ...existingProfile,
        personalInfo: { ...existingProfile.personalInfo, ...data.personalInfo },
        professionalInfo: { ...existingProfile.professionalInfo, ...data.professionalInfo },
        preferences: { ...existingProfile.preferences, ...data.preferences },
        updatedAt: Timestamp.now()
      };

      const validation = ProfileValidation.validateCandidateProfile(updatedProfile);
      if (!validation.isValid) {
        throw new BadRequestException(`Datos de perfil inválidos: ${validation.errors.join(', ')}`);
      }

      // Sanitize and save
      const sanitizedProfile = ProfileValidation.sanitizeProfileData(updatedProfile);
      
      await firestore
        .collection(FIRESTORE_COLLECTIONS.CANDIDATES)
        .doc(userId)
        .set(sanitizedProfile, { merge: true });

      return sanitizedProfile;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error updating candidate profile:', error);
      throw new BadRequestException('Error al actualizar el perfil de candidato');
    }
  }

  /**
   * Update company profile
   * Validates: Requirements 4.3
   */
  async updateCompanyProfile(userId: string, data: UpdateCompanyProfileDto): Promise<CompanyProfile> {
    const firestore = this.fb.firestore();

    try {
      // Get existing profile
      const existingDoc = await firestore
        .collection(FIRESTORE_COLLECTIONS.COMPANIES)
        .doc(userId)
        .get();

      if (!existingDoc.exists) {
        throw new NotFoundException('Perfil de empresa no encontrado');
      }

      const existingProfile = existingDoc.data() as CompanyProfile;

      // Merge and validate updated data
      const updatedProfile: CompanyProfile = {
        ...existingProfile,
        companyInfo: { ...existingProfile.companyInfo, ...data.companyInfo },
        contactInfo: { ...existingProfile.contactInfo, ...data.contactInfo },
        updatedAt: Timestamp.now()
      };

      const validation = ProfileValidation.validateCompanyProfile(updatedProfile);
      if (!validation.isValid) {
        throw new BadRequestException(`Datos de perfil inválidos: ${validation.errors.join(', ')}`);
      }

      // Sanitize and save
      const sanitizedProfile = ProfileValidation.sanitizeProfileData(updatedProfile);
      
      await firestore
        .collection(FIRESTORE_COLLECTIONS.COMPANIES)
        .doc(userId)
        .set(sanitizedProfile, { merge: true });

      return sanitizedProfile;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error updating company profile:', error);
      throw new BadRequestException('Error al actualizar el perfil de empresa');
    }
  }

  /**
   * Delete candidate profile
   * Validates: Requirements 4.4
   */
  async deleteCandidateProfile(userId: string): Promise<void> {
    try {
      const doc = await this.fb.firestore()
        .collection(FIRESTORE_COLLECTIONS.CANDIDATES)
        .doc(userId)
        .get();

      if (!doc.exists) {
        throw new NotFoundException('Perfil de candidato no encontrado');
      }

      await this.fb.firestore()
        .collection(FIRESTORE_COLLECTIONS.CANDIDATES)
        .doc(userId)
        .delete();
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error deleting candidate profile:', error);
      throw new BadRequestException('Error al eliminar el perfil de candidato');
    }
  }

  /**
   * Delete company profile
   * Validates: Requirements 4.4
   */
  async deleteCompanyProfile(userId: string): Promise<void> {
    try {
      const doc = await this.fb.firestore()
        .collection(FIRESTORE_COLLECTIONS.COMPANIES)
        .doc(userId)
        .get();

      if (!doc.exists) {
        throw new NotFoundException('Perfil de empresa no encontrado');
      }

      await this.fb.firestore()
        .collection(FIRESTORE_COLLECTIONS.COMPANIES)
        .doc(userId)
        .delete();
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error deleting company profile:', error);
      throw new BadRequestException('Error al eliminar el perfil de empresa');
    }
  }

  /**
   * Generic profile update method
   * Validates: Requirements 4.3
   */
  async updateProfile(
    userId: string, 
    profileType: ProfileType, 
    data: UpdateCandidateProfileDto | UpdateCompanyProfileDto
  ): Promise<CandidateProfile | CompanyProfile> {
    if (profileType === 'candidate') {
      return this.updateCandidateProfile(userId, data as UpdateCandidateProfileDto);
    } else {
      return this.updateCompanyProfile(userId, data as UpdateCompanyProfileDto);
    }
  }

  /**
   * Generic profile deletion method
   * Validates: Requirements 4.4
   */
  async deleteProfile(userId: string, profileType: ProfileType): Promise<void> {
    if (profileType === 'candidate') {
      await this.deleteCandidateProfile(userId);
    } else {
      await this.deleteCompanyProfile(userId);
    }
  }

  /**
   * Check if profile exists
   */
  async profileExists(userId: string, profileType: ProfileType): Promise<boolean> {
    try {
      const collection = profileType === 'candidate' 
        ? FIRESTORE_COLLECTIONS.CANDIDATES 
        : FIRESTORE_COLLECTIONS.COMPANIES;

      const doc = await this.fb.firestore()
        .collection(collection)
        .doc(userId)
        .get();

      return doc.exists;
    } catch (error) {
      console.error('Error checking profile existence:', error);
      return false;
    }
  }

  /**
   * Prevent cross-profile data contamination
   * Validates: Requirements 1.5, 5.1
   */
  async validateProfileIsolation(userId: string): Promise<{ isValid: boolean; issues: string[] }> {
    try {
      const candidateProfile = await this.getCandidateProfile(userId);
      const companyProfile = await this.getCompanyProfile(userId);
      const issues: string[] = [];

      // Check for data leakage between profiles
      if (candidateProfile && companyProfile) {
        // Verify no company data in candidate profile
        if ('companyInfo' in candidateProfile || 'jobPostings' in candidateProfile) {
          issues.push('Candidate profile contains company data');
        }

        // Verify no candidate data in company profile
        if ('personalInfo' in companyProfile || 'applications' in companyProfile) {
          issues.push('Company profile contains candidate data');
        }

        // Verify separate user IDs are consistent
        if (candidateProfile.userId !== companyProfile.userId) {
          issues.push('Profile user IDs do not match');
        }
      }

      return {
        isValid: issues.length === 0,
        issues
      };
    } catch (error) {
      console.error('Error validating profile isolation:', error);
      return {
        isValid: false,
        issues: ['Error validating profile isolation']
      };
    }
  }
}