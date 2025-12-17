// backend/src/notifications/notifications.controller.ts
import { Body, Controller, Get, Post, Query, Inject } from '@nestjs/common';
import type { App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  private db: Firestore;

  constructor(
    private readonly notifications: NotificationsService,
    @Inject('FIREBASE_ADMIN') private readonly app: App,
  ) {
    this.db = getFirestore(app); // inicialización aquí
  }

  @Post('application-status')
  async sendApplicationStatus(
    @Body()
    body: {
      email: string;
      vacancyTitle: string;
      status: string;
    },
  ) {
    await this.notifications.sendApplicationStatus(body.email, {
      vacancyTitle: body.vacancyTitle,
      status: body.status,
    });

    return { success: true };
  }

  @Post('nearby-vacancies')
  async sendNearbyVacancies(
    @Body()
    body: {
      email: string;
      count: number;
    },
  ) {
    await this.notifications.sendNearbyVacancies(body.email, body.count);
    return { success: true };
  }

  @Get('unread-count')
  async unreadCount(@Query('uid') uid: string) {
    if (!uid) return { ok: false, error: 'uid requerido' };

    const snap = await this.db
      .collection('notifications')
      .where('uid', '==', uid)
      .where('read', '==', false)
      .get();

    return { ok: true, unread: snap.size };
  }
  @Get()
  async listNotifications(@Query('uid') uid: string) {
    if (!uid) return { ok: false, error: 'uid requerido' };

    const snap = await this.db
      .collection('notifications')
      .where('uid', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const items = snap.docs.map((d) => d.data());

    return { ok: true, items };
  }

}
