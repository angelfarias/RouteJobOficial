// backend/src/unified-email/interfaces/candidate-profile.interface.ts
import { Timestamp } from 'firebase-admin/firestore';

export interface CandidateProfile {
  userId: string; // Reference to Firebase Auth UID
  personalInfo: {
    firstName: string;
    lastName: string;
    phone?: string;
    location?: string;
  };
  professionalInfo: {
    title?: string;
    experience?: string;
    skills: string[];
    resume?: string;
  };
  preferences: {
    jobTypes: string[];
    locations: string[];
    salaryRange?: {
      min: number;
      max: number;
    };
  };
  applications: string[]; // References to job applications
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateCandidateProfileDto {
  personalInfo: {
    firstName: string;
    lastName: string;
    phone?: string;
    location?: string;
  };
  professionalInfo?: {
    title?: string;
    experience?: string;
    skills?: string[];
    resume?: string;
  };
  preferences?: {
    jobTypes?: string[];
    locations?: string[];
    salaryRange?: {
      min: number;
      max: number;
    };
  };
}

export interface UpdateCandidateProfileDto {
  personalInfo?: Partial<CandidateProfile['personalInfo']>;
  professionalInfo?: Partial<CandidateProfile['professionalInfo']>;
  preferences?: Partial<CandidateProfile['preferences']>;
}