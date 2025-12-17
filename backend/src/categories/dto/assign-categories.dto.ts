import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';

export class AssignCategoriesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  categoryIds: string[];
}