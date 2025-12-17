import { Module } from '@nestjs/common';
import { MatchController } from './match.controller';
import { MatchService } from './match.service';
import { VacanciesModule } from '../vacancies/vacancies.module';
import { CandidatesModule } from '../candidates/candidates.module';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [VacanciesModule, CandidatesModule, CategoriesModule],
  controllers: [MatchController],
  providers: [MatchService],
})
export class MatchModule {}
