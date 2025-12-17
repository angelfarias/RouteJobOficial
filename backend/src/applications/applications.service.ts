// backend/src/applications/applications.service.ts
import { Inject, Injectable } from '@nestjs/common';
import type { App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ApplicationsService {
  private db: Firestore;

  constructor(
    @Inject('FIREBASE_ADMIN') app: App,
    private readonly notifications: NotificationsService,
  ) {
    this.db = getFirestore(app);
  }

  async postular(uid: string, vacancyId: string) {
    console.log('[applications] postular', { uid, vacancyId });
    const now = admin.firestore.FieldValue.serverTimestamp();

    // 1) guardar postulación
    const appRef = this.db.collection('applications').doc();
    await appRef.set({
      id: appRef.id,
      uid,
      vacancyId,
      status: 'pending',
      createdAt: now,
    });

    // 2) crear notificación in‑app
    const notifRef = this.db.collection('notifications').doc();
    await notifRef.set({
      id: notifRef.id,
      uid,
      type: 'APPLICATION_CREATED',
      vacancyId,
      read: false,
      createdAt: now,
    });

    // 3) enviar correo usando NotificationsService (no romper si falla SMTP)
    const userSnap = await this.db.collection('users').doc(uid).get();
    const userData = userSnap.data() as any;
    const email = userData?.email;

    const vacSnap = await this.db.collection('vacancies').doc(vacancyId).get();
    const vacData = vacSnap.data() as any;
    const vacancyTitle = vacData?.title || 'una vacante';

    console.log('[applications] user data', { email });
    console.log('[applications] vacancy data', { vacancyTitle });

    if (email) {
      try {
        console.log('[applications] enviando correo a', email, 'vacante', vacancyTitle);
        await this.notifications.sendApplicationStatus(email, {
          vacancyTitle,
          status: 'pendiente',
        });
        console.log('[applications] correo enviado OK');
      } catch (e) {
        console.error('[applications] error al enviar correo', e);
        // no relanzar: la postulación igual se considera exitosa
      }
    } else {
      console.warn('[applications] usuario sin email, no se envía correo');
    }

    return { ok: true };
  }

  async unreadCount(uid: string) {
    const snap = await this.db
      .collection('notifications')
      .where('uid', '==', uid)
      .where('read', '==', false)
      .get();

    return { ok: true, unread: snap.size };
  }
}
