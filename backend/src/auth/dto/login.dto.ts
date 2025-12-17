// backend/src/auth/dto/login.dto.ts
import { IsEmail, IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'El correo electrónico es requerido' })
  @IsEmail({}, { message: 'Formato de correo electrónico inválido' })
  @MaxLength(254, { message: 'El correo electrónico es demasiado largo' })
  email: string;

  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  password: string;
}