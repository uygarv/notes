import { Module } from "@nestjs/common";
import { UsersService } from "./users.service";
import { PrismaModule } from "src/prisma/prisma.module";
import { UsersController } from "./users.controller";
import { ProfileImageService } from './profile-image.service';

@Module({
    exports: [UsersService],
    providers: [UsersService, ProfileImageService],
    imports: [PrismaModule],
    controllers: [UsersController]
})
export class UsersModule {}
