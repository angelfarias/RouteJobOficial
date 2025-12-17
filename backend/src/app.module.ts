import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { FirebaseModule } from './firebase/firebase.module';
import { ChatAssistantModule } from './chat-assistant/chat-assistant.module';
import { VacanciesModule } from './vacancies/vacancies.module';
import { CandidatesModule } from './candidates/candidates.module';
import { CompaniesModule } from './companies/companies.module';
import { BranchesModule } from './branches/branches.module';
import { MatchModule } from './match/match.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ApplicationsModule} from './applications/applications.module';
import { MailerModule } from './mailer/mailer.module';
import { CategoriesModule } from './categories/categories.module';



@Module({
  imports: [FirebaseModule, AuthModule,
    ChatAssistantModule, VacanciesModule, CandidatesModule, CompaniesModule,
    BranchesModule, MatchModule, NotificationsModule, ApplicationsModule, MailerModule, CategoriesModule],
  controllers: [AppController],
  providers: [AppService],

})
export class AppModule { }