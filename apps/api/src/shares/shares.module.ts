import { Module } from '@nestjs/common';

import { NotesModule } from 'src/notes/notes.module';
import { AuthModule } from 'src/auth/auth.module';
import { SharesController } from './shares.controller';

@Module({
  imports: [NotesModule, AuthModule],
  controllers: [SharesController],
})
export class SharesModule {}
