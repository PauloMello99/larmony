import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../../auth/guards/auth.guard";
import { PlatformAdminGuard } from "../../auth/guards/platform-admin.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import type { AuthUser } from "../../auth/application/ports/auth-provider.interface";
import { GetMeUseCase } from "../../user/application/use-cases/get-me.use-case";
import { ListSupportTicketsUseCase } from "../application/use-cases/list-support-tickets.use-case";
import { GetSupportTicketUseCase } from "../application/use-cases/get-support-ticket.use-case";
import { ReplyAsAdminUseCase } from "../application/use-cases/reply-as-admin.use-case";
import { SetSupportTicketStatusUseCase } from "../application/use-cases/set-support-ticket-status.use-case";
import { ListSupportTicketsQueryDto } from "./dto/list-support-tickets-query.dto";
import { ReplySupportTicketDto } from "./dto/reply-support-ticket.dto";
import { SetSupportTicketStatusDto } from "./dto/set-support-ticket-status.dto";

/** Inbox de suporte do admin (M15 PR3) — vê e responde qualquer ticket. */
@Controller("admin/support/tickets")
@UseGuards(AuthGuard, PlatformAdminGuard)
export class AdminSupportController {
  constructor(
    private readonly getMe: GetMeUseCase,
    private readonly listTickets: ListSupportTicketsUseCase,
    private readonly getTicket: GetSupportTicketUseCase,
    private readonly replyAsAdmin: ReplyAsAdminUseCase,
    private readonly setStatus: SetSupportTicketStatusUseCase,
  ) {}

  @Get()
  list(@Query() query: ListSupportTicketsQueryDto) {
    return this.listTickets.execute(query);
  }

  @Get(":id")
  get(@Param("id", ParseUUIDPipe) id: string) {
    return this.getTicket.execute(id);
  }

  @Post(":id/messages")
  async reply(
    @CurrentUser() authUser: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ReplySupportTicketDto,
  ) {
    const admin = await this.getMe.execute(authUser);
    return this.replyAsAdmin.execute(id, admin.id, dto.body);
  }

  @Patch(":id/status")
  @HttpCode(HttpStatus.NO_CONTENT)
  async changeStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SetSupportTicketStatusDto,
  ) {
    await this.setStatus.execute(id, dto.status);
  }
}
