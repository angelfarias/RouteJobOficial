// src/branches/branches.module.ts
import { Module } from '@nestjs/common';
import { BranchesController } from './branches.controller';
import { BranchesService } from './branches.service';
import { FirebaseModule } from '../firebase/firebase.module';

@Module({
  imports: [FirebaseModule],
  controllers: [BranchesController],
  providers: [BranchesService],
  exports: [BranchesService],
})
export class BranchesModule {}
