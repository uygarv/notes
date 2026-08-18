import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { NotesModule } from './notes/notes.module';
import { TagsModule } from './tags/tags.module';
import { UsersService } from './users/users.service';
import { AuthService } from './auth/auth.service';
import { AuthModule } from './auth/auth.module';
import { RedisService } from './redis/redis.service';
import { RedisModule } from './redis/redis.module';
import { SharesModule } from './shares/shares.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    NotesModule,
    TagsModule,
    AuthModule,
    RedisModule,
    SharesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
