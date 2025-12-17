// src/branches/branches.service.ts
import { Inject, Injectable } from '@nestjs/common';
import type * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export interface Branch {
  id?: string;
  companyId: string;
  name: string;
  address: string;
  comuna?: string;
  ciudad?: string;
  latitude: number;
  longitude: number;
  phone?: string | null;
  active: boolean;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

@Injectable()
export class BranchesService {
  private readonly collection: FirebaseFirestore.CollectionReference;

  constructor(
    @Inject('FIREBASE_ADMIN') private readonly firebaseApp: admin.app.App,
  ) {
    this.collection = this.firebaseApp.firestore().collection('branches');
  }

  async createBranch(companyId: string, dto: Partial<Branch>): Promise<Branch> {
    const now = Timestamp.now();
    const docRef = this.collection.doc();

    const data: Branch = {
      companyId,
      name: dto.name!,
      address: dto.address!,
      comuna: dto.comuna ?? '',
      ciudad: dto.ciudad ?? '',
      latitude: dto.latitude!,
      longitude: dto.longitude!,
      phone: dto.phone ?? null,
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(data);
    return { id: docRef.id, ...data };
  }

  async listByCompany(companyId: string): Promise<Branch[]> {
    const snap = await this.collection.where('companyId', '==', companyId).get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Branch) }));
  }

 
  async getById(branchId: string): Promise<Branch | null> {
    const doc = await this.collection.doc(branchId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...(doc.data() as Branch) };
  }
}
