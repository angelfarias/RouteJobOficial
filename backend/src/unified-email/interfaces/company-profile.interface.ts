// backend/src/unified-email/interfaces/company-profile.interface.ts
import { Timestamp } from 'firebase-admin/firestore';

export interface CompanyProfile {
  userId: string; // Reference to Firebase Auth UID
  companyInfo: {
    name: string;
    description?: string;
    industry?: string;
    size?: string;
    website?: string;
    logo?: string;
  };
  contactInfo: {
    contactPerson: string;
    phone?: string;
    address?: string;
  };
  jobPostings: string[]; // References to job postings
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateCompanyProfileDto {
  companyInfo: {
    name: string;
    description?: string;
    industry?: string;
    size?: string;
    website?: string;
    logo?: string;
  };
  contactInfo: {
    contactPerson: string;
    phone?: string;
    address?: string;
  };
}

export interface UpdateCompanyProfileDto {
  companyInfo?: Partial<CompanyProfile['companyInfo']>;
  contactInfo?: Partial<CompanyProfile['contactInfo']>;
}