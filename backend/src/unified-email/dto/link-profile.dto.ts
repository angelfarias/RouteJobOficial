// backend/src/unified-email/dto/link-profile.dto.ts
import { IsEmail, IsString, IsNotEmpty, IsIn, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateCandidateProfileDto, CreateCompanyProfileDto } from '../interfaces';

export class LinkProfileDto {
  @IsNotEmpty({ message: 'El correo electrónico es requerido' })
  @IsEmail({}, { message: 'Formato de correo electrónico inválido' })
  email: string;

  @IsNotEmpty({ message: 'La contraseña es requerida para verificar la propiedad de la cuenta' })
  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  password: string;

  @IsNotEmpty({ message: 'El tipo de perfil es requerido' })
  @IsIn(['candidate', 'company'], { message: 'El tipo de perfil debe ser "candidate" o "company"' })
  profileType: 'candidate' | 'company';

  @IsNotEmpty({ message: 'Los datos del perfil son requeridos' })
  @IsObject({ message: 'Los datos del perfil deben ser un objeto' })
  profileData: CreateCandidateProfileDto | CreateCompanyProfileDto;
}

export class ProfileLinkingResult {
  success: boolean;
  message: string;
  profileType: 'candidate' | 'company';
  userId: string;
}