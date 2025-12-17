import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum, Min, Max } from 'class-validator';

export class AdvancedSearchDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  level?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minVacancyCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxVacancyCount?: number;

  @IsOptional()
  @IsBoolean()
  includeInactive?: boolean;

  @IsOptional()
  @IsEnum(['name', 'vacancyCount', 'level', 'displayOrder'])
  sortBy?: 'name' | 'vacancyCount' | 'level' | 'displayOrder';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}