// backend/src/chat-assistant/chat-assistant.module.ts
import { Module } from '@nestjs/common';
import { ChatAssistantController } from './chat-assistant.controller';
import { ChatAssistantService } from './chat-assistant.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [FirebaseModule, CategoriesModule],
  controllers: [ChatAssistantController],
  providers: [ChatAssistantService],
})
export class ChatAssistantModule {}
