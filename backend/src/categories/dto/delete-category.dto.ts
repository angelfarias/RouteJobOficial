import { IsEnum, IsOptional } from 'class-validator';
import { DeletionStrategy } from '../interfaces/category.interface';

export class DeleteCategoryDto {
  @IsOptional()
  @IsEnum(DeletionStrategy)
  strategy?: DeletionStrategy;
}