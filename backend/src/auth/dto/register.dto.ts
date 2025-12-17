// backend/src/auth/dto/register.dto.ts
import { IsEmail, IsString, MinLength, MaxLength, Matches, IsNotEmpty } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre es demasiado largo' })
  name: string;

  @IsNotEmpty({ message: 'El correo electrónico es requerido' })
  @IsEmail({}, { message: 'Formato de correo electrónico inválido' })
  @MaxLength(254, { message: 'El correo electrónico es demasiado largo' })
  email: string;

  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(128, { message: 'La contraseña es demasiado larga' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/, {
    message: 'La contraseña debe contener al menos: una letra minúscula, una mayúscula, un número y un símbolo'
  })
  password: string;
}
