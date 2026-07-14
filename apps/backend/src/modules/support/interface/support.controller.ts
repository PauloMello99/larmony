import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../../auth/guards/auth.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import type { AuthUser } from "../../auth/application/ports/auth-provider.interface";
import { GetMeUseCase } from "../../user/application/use-cases/get-me.use-case";
import { CreateSupportTicketUseCase } from "../application/use-cases/create-support-ticket.use-case";
import { ListMySupportTicketsUseCase } from "../application/use-cases/list-my-support-tickets.use-case";
import { GetMySupportTicketUseCase } from "../application/use-cases/get-my-support-ticket.use-case";
import { ReplyToMySupportTicketUseCase } from "../application/use-cases/reply-to-my-support-ticket.use-case";
import { CreateSupportTicketDto } from "./dto/create-support-ticket.dto";
import { ReplySupportTicketDto } from "./dto/reply-support-ticket.dto";
import { PageQueryDto } from "./dto/page-query.dto";

/** Canal de suporte in-app (M15 PR3) — só os próprios tickets do usuário autenticado. */
@Controller("support/tickets")
@UseGuards(AuthGuard)
export class SupportController {
  constructor(
    private readonly getMe: GetMeUseCase,
    private readonly createTicket: CreateSupportTicketUseCase,
    private readonly listMyTickets: ListMySupportTicketsUseCase,
    private readonly getMyTicket: GetMySupportTicketUseCase,
    private readonly replyToMyTicket: ReplyToMySupportTicketUseCase,
  ) {}

  @Post()
  async create(@CurrentUser() authUser: AuthUser, @Body() dto: CreateSupportTicketDto) {
    const user = await this.getMe.execute(authUser);
    return this.createTicket.execute(user.id, null, user.name, dto);
  }

  @Get()
  async list(@CurrentUser() authUser: AuthUser, @Query() query: PageQueryDto) {
    const user = await this.getMe.execute(authUser);
    return this.listMyTickets.execute(user.id, query);
  }

  @Get(":id")
  async get(@CurrentUser() authUser: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    const user = await this.getMe.execute(authUser);
    return this.getMyTicket.execute(id, user.id);
  }

  @Post(":id/messages")
  async reply(
    @CurrentUser() authUser: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ReplySupportTicketDto,
  ) {
    const user = await this.getMe.execute(authUser);
    return this.replyToMyTicket.execute(id, user.id, dto.body);
  }
}
