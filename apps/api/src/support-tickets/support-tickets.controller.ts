import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { JwtGuard } from '../auth/guards/jwt/jwt.guard.js';
import { SupportTicketsService } from './support-tickets.service.js';

class CreateTicketDto {
  @IsString() @IsIn(['PROBLEM', 'SUGGESTION', 'CHANGE', 'OTHER']) category!: string;
  @IsString() @MinLength(5) @MaxLength(120) title!: string;
  @IsString() @MinLength(10) @MaxLength(3000) description!: string;
  @IsOptional() @IsString() @MaxLength(400000) imageData?: string;
}
class CommentDto {
  @IsString() @MinLength(1) @MaxLength(2000) body!: string;
}
class StatusDto {
  @IsString() @IsIn(['NEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED']) status!: string;
}
type AuthRequest = { user: { id: string; role: string } };

@Controller('support-tickets')
@UseGuards(JwtGuard)
export class SupportTicketsController {
  constructor(private readonly service: SupportTicketsService) {}
  @Get()
  list(@Query('page') page?: string) { return this.service.list(page); }
  @Get(':id')
  one(@Param('id') id: string) { return this.service.one(id); }
  @Post()
  create(@Body() data: CreateTicketDto, @Req() request: AuthRequest) { return this.service.create(data, request.user.id); }
  @Post(':id/messages')
  comment(@Param('id') id: string, @Body() data: CommentDto, @Req() request: AuthRequest) { return this.service.comment(id, data.body, request.user.id); }
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() data: StatusDto, @Req() request: AuthRequest) { return this.service.updateStatus(id, data.status, request.user.role); }
}
