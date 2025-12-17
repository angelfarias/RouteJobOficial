import { IsArray, IsOptional, IsBoolean, IsString, IsNumber, Min } from 'class-validator';

export class FilterCategoriesDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  parentIds?: string[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  levels?: number[];

  @IsOptional()
  @IsBoolean()
  hasVacancies?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  nameContains?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minChildCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxChildCount?: number;
}