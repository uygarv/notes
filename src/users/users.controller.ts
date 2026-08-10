import { UseGuards, Get, Patch, Body, Request, Controller } from "@nestjs/common";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersService } from "./users.service";
import { AuthGuard } from "@nestjs/passport";

@Controller({
  path: "users",
})
export class UsersController {
    constructor(
        private readonly usersService: UsersService
    ) {}

    @Get('me')
    @UseGuards(AuthGuard('jwt'))
    async getUser(@Request() req) {
        return this.usersService.findById(req.user.userId);
    }

    @Patch('me')
    @UseGuards(AuthGuard('jwt'))
    async updateUser(@Body() user: UpdateUserDto, @Request() req) {
        return await this.usersService.updateUser(user, req.user.userId)
    }
}