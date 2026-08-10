import { Module } from "@nestjs/common";
import { UsersService } from "./users.service";
import { PrismaModule } from "src/prisma/prisma.module";
import { UsersController } from "./users.controller";

@Module({
    exports: [UsersService],
    providers: [UsersService],
    imports: [PrismaModule],
    controllers: [UsersController]
})
export class UsersModule {}