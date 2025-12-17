// backend/src/candidates/candidates.service.ts
import { Inject, Injectable } from '@nestjs/common';
import type { App } from 'firebase-admin/app';
import { Firestore, getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';

@Injectable()
export class CandidatesService {
  private db: Firestore;

  constructor(
    @Inject('FIREBASE_ADMIN') firebaseApp: App,
  ) {
    this.db = getFirestore(firebaseApp);
  }

  async obtenerCandidato(uid: string) {
    const doc = await this.db.collection('candidates').doc(uid).get();
    if (!doc.exists) return null;
    return doc.data();
  }

  // guardar/actualizar experiencia desde el asistente
  async actualizarExperience(uid: string, experience: string[]) {
    const profileCompleted = experience.length > 0; // criterio simple

    await this.db.collection('candidates').doc(uid).set(
      {
        uid,
        experience,
        profileCompleted,
        lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  // guardar/actualizar ubicación + radio (por ejemplo desde un endpoint /location)
  async actualizarLocation(
    uid: string,
    location: { latitude: number; longitude: number },
    radioKm: number,
  ) {
    await this.db.collection('candidates').doc(uid).set(
      {
        uid,
        location,
        radioKm,
        lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  // opcional: guardar skills
  async actualizarSkills(uid: string, skills: string[]) {
    await this.db.collection('candidates').doc(uid).set(
      {
        uid,
        skills,
        lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  // guardar/actualizar preferencias de categorías
  async actualizarCategoryPreferences(
    uid: string, 
    preferredCategories: string[],
    categoryWeights?: { [categoryId: string]: number }
  ) {
    await this.db.collection('candidates').doc(uid).set(
      {
        uid,
        preferredCategories,
        categoryWeights: categoryWeights || {},
        lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  // actualizar pesos de matching
  async actualizarMatchWeights(
    uid: string,
    weights: {
      location?: number;
      category?: number;
      experience?: number;
      skills?: number;
    }
  ) {
    await this.db.collection('candidates').doc(uid).set(
      {
        uid,
        matchWeights: weights,
        lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }
}
