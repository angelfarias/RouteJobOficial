import { IsArray, IsString, IsOptional, ArrayNotEmpty } from 'class-validator';

export class AssignVacanciesToCategoryDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  vacancyIds: string[];

  @IsOptional()
  @IsString()
  assignedBy?: string;
}