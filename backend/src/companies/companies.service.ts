// src/companies/companies.service.ts
import { Inject, Injectable } from '@nestjs/common';
import type * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export interface Company {
  id?: string;
  name: string;
  rut?: string | null;
  ownerUid: string;
  description?: string;
  industry?: string;
  website?: string | null;
  phone?: string | null;
  email: string;
  logoUrl?: string | null;
  verified: boolean;
  active: boolean;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

@Injectable()
export class CompaniesService {
  private readonly collection: FirebaseFirestore.CollectionReference;

  constructor(
    @Inject('FIREBASE_ADMIN') private readonly firebaseApp: admin.app.App, // 👈 viene de FirebaseModule
  ) {
    this.collection = this.firebaseApp.firestore().collection('companies');
  }

  async createCompany(ownerUid: string, dto: Partial<Company>): Promise<Company> {
    const now = Timestamp.now();
    const docRef = this.collection.doc();

    const data: Company = {
      name: dto.name!,
      rut: dto.rut ?? null,
      ownerUid,
      description: dto.description ?? '',
      industry: dto.industry ?? '',
      website: dto.website ?? null,
      phone: dto.phone ?? null,
      email: dto.email!,
      logoUrl: dto.logoUrl ?? null,
      verified: false,
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(data);
    return { id: docRef.id, ...data };
  }

  async getCompanyByOwner(ownerUid: string): Promise<Company | null> {
    const snap = await this.collection.where('ownerUid', '==', ownerUid).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...(doc.data() as Company) };
  }

  async updateCompany(
    companyId: string,
    ownerUid: string,
    dto: Partial<Company>,
  ): Promise<Company | null> {
    const docRef = this.collection.doc(companyId);
    const doc = await docRef.get();
    if (!doc.exists) return null;

    const current = doc.data() as Company;
    if (current.ownerUid !== ownerUid) {
      throw new Error('UNAUTHORIZED_COMPANY_OWNER');
    }

    const updated: Partial<Company> = {
      ...dto,
      updatedAt: Timestamp.now(),
    };

    await docRef.update(updated);
    return { id: doc.id, ...current, ...updated };
  }
}
