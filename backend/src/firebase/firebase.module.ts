// backend/src/firebase/firebase.module.ts
import { Module, Global } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

@Global()
@Module({
  providers: [
    {
      provide: 'FIREBASE_ADMIN',
      useFactory: () => {
        const saPath =
          process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
          path.join(process.cwd(), 'firebase-service-account.json');

        let app: admin.app.App;

        if (fs.existsSync(saPath)) {
          const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));

          app = admin.initializeApp({
            credential: admin.credential.cert(
              serviceAccount as admin.ServiceAccount,
            ),
            projectId:
              process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id,
            storageBucket:
              process.env.FIREBASE_STORAGE_BUCKET ||
              serviceAccount.storage_bucket,
          });
        } else {
          // Fallback: usar configuración por variables de entorno
          app = admin.initializeApp({
            projectId: process.env.FIREBASE_PROJECT_ID,
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
          });
        }

        const tenantId = process.env.FIREBASE_TENANT_ID;
        if (tenantId) {
          // No lanzar error si no existe; solo loguear en consola
          app
            .auth()
            .tenantManager()
            .getTenant(tenantId)
            .catch(() => {
              console.warn(`FIREBASE_TENANT_ID ${tenantId} not found`);
            });
        }

        return app;
      },
    },
  ],
  exports: ['FIREBASE_ADMIN'],
})
export class FirebaseModule {}
