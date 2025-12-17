import { Module } from '@nestjs/common';
import { VacanciesController } from './vacancies.controller';
import { VacanciesService } from './vacancies.service';
import { CategoriesModule } from '../categories/categories.module';
import { ApplicationsModule } from '../applications/applications.module';

@Module({
  imports: [CategoriesModule, ApplicationsModule],
  controllers: [VacanciesController],
  providers: [VacanciesService],
  exports: [VacanciesService],
})
export class VacanciesModule {}
