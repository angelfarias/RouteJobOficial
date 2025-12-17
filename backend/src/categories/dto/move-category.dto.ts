import { IsString, IsOptional } from 'class-validator';

export class MoveCategoryDto {
  @IsOptional()
  @IsString()
  newParentId?: string | null;
}