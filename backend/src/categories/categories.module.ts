import { Module, forwardRef } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CategoryVacancyService } from './category-vacancy.service';
import { CategorySeeder } from './seed-categories';
import { FirebaseModule } from '../firebase/firebase.module';

@Module({
  imports: [FirebaseModule],
  controllers: [CategoriesController],
  providers: [CategoriesService, CategoryVacancyService, CategorySeeder],
  exports: [CategoriesService, CategoryVacancyService],
})
export class CategoriesModule {}