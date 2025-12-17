// backend/src/auth/auth.service.ts
import { ConflictException, Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import type * as admin from 'firebase-admin';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(@Inject('FIREBASE_ADMIN') private readonly fb: typeof import('firebase-admin')) {}

  async register(dto: RegisterDto) {
    const auth = this.fb.auth();

    try {
      // Verificar existencia por email
      try {
        await auth.getUserByEmail(dto.email.toLowerCase());
        throw new ConflictException('Este correo electrónico ya está registrado');
      } catch (e: any) {
        if (e?.code !== 'auth/user-not-found') throw e;
      }

      // Validar formato de email adicional
      if (!this.isValidEmail(dto.email)) {
        throw new BadRequestException('Formato de correo electrónico inválido');
      }

      // Crear usuario
      const user = await auth.createUser({
        email: dto.email.toLowerCase(),
        password: dto.password,
        displayName: dto.name,
        emailVerified: false,
        disabled: false,
      });

      // Guardar perfil en Firestore con información adicional
      const profile = {
        uid: user.uid,
        name: dto.name,
        email: dto.email.toLowerCase(),
        emailVerified: false,
        profileComplete: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        preferences: {
          notifications: true,
          language: 'es',
          timezone: 'America/Santiago'
        },
        securitySettings: {
          twoFactorEnabled: false,
          lastPasswordChange: new Date().toISOString(),
          loginHistory: []
        }
      };

      await this.fb.firestore()
        .collection(process.env.FIREBASE_USERS_COLLECTION || 'users')
        .doc(user.uid)
        .set(profile, { merge: true });

      return profile;

    } catch (error: any) {
      // Handle Firebase Auth errors
      if (error.code === 'auth/email-already-exists') {
        throw new ConflictException('Este correo electrónico ya está registrado');
      } else if (error.code === 'auth/invalid-email') {
        throw new BadRequestException('Formato de correo electrónico inválido');
      } else if (error.code === 'auth/weak-password') {
        throw new BadRequestException('La contraseña es demasiado débil');
      }
      throw error;
    }
  }

  async sendPasswordResetEmail(email: string) {
    const auth = this.fb.auth();

    try {
      // Verificar que el usuario existe
      await auth.getUserByEmail(email.toLowerCase());
      
      // Generar link de reset (esto se haría normalmente desde el cliente)
      // Aquí solo validamos que el usuario existe
      return { 
        message: 'Si existe una cuenta con este correo, recibirás un enlace de recuperación',
        success: true 
      };

    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        // Por seguridad, no revelamos si el email existe o no
        return { 
          message: 'Si existe una cuenta con este correo, recibirás un enlace de recuperación',
          success: true 
        };
      }
      throw new BadRequestException('Error al procesar la solicitud');
    }
  }

  async validateUser(dto: LoginDto) {
    if (!this.isValidEmail(dto.email)) {
      throw new BadRequestException('Formato de correo electrónico inválido');
    }

    try {
      const user = await this.fb.auth().getUserByEmail(dto.email.toLowerCase());
      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        emailVerified: user.emailVerified,
        disabled: user.disabled
      };
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        throw new NotFoundException('Usuario no encontrado');
      }
      throw error;
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email) && email.length <= 254;
  }
}
