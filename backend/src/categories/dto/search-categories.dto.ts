import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class SearchCategoriesDto {
  @IsString()
  query: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;

  @IsOptional()
  @IsString()
  parentId?: string;
}