import { ReplyAsAdminUseCase } from "./reply-as-admin.use-case";
import { SupportTicketNotFoundException } from "../../domain/exceptions/support-ticket-not-found.exception";
import { SupportTicketClosedException } from "../../domain/exceptions/support-ticket-closed.exception";
import type { ISupportTicketRepository } from "../../domain/support-ticket.repository.interface";
import type { SupportTicketDetail, SupportTicketStatus } from "../../domain/support-ticket.entity";
import type { DispatchNotificationUseCase } from "../../../notifications/application/use-cases/dispatch-notification.use-case";

function ticket(status: SupportTicketStatus): SupportTicketDetail {
  return {
    id: "ticket_1",
    userId: "user_1",
    householdId: null,
    category: "problem",
    status,
    subject: "Bug no app",
    createdAt: new Date(),
    updatedAt: new Date(),
    messages: [],
  };
}

function make() {
  const tickets = {
    findByIdAny: jest.fn(),
    addMessage: jest.fn().mockResolvedValue({
      id: "msg_1",
      authorUserId: "admin_1",
      authorName: "Suporte",
      isAdmin: true,
      body: "Resposta do suporte",
      createdAt: new Date(),
    }),
    setStatus: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<ISupportTicketRepository>;
  const dispatch = {
    execute: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<DispatchNotificationUseCase>;
  const uc = new ReplyAsAdminUseCase(tickets, dispatch);
  return { uc, tickets, dispatch };
}

describe("ReplyAsAdminUseCase", () => {
  it("ticket inexistente → 404", async () => {
    const { uc, tickets } = make();
    tickets.findByIdAny.mockResolvedValue(null);

    await expect(uc.execute("ticket_1", "admin_1", "Resposta")).rejects.toBeInstanceOf(
      SupportTicketNotFoundException,
    );
  });

  it("ticket fechado → 409, não grava mensagem nem notifica", async () => {
    const { uc, tickets, dispatch } = make();
    tickets.findByIdAny.mockResolvedValue(ticket("closed"));

    await expect(uc.execute("ticket_1", "admin_1", "Resposta")).rejects.toBeInstanceOf(
      SupportTicketClosedException,
    );
    expect(tickets.addMessage).not.toHaveBeenCalled();
    expect(dispatch.execute).not.toHaveBeenCalled();
  });

  it("responde, marca 'answered' e notifica o autor do ticket", async () => {
    const { uc, tickets, dispatch } = make();
    tickets.findByIdAny.mockResolvedValue(ticket("open"));

    await uc.execute("ticket_1", "admin_1", "Resposta do suporte");

    expect(tickets.addMessage).toHaveBeenCalledWith("ticket_1", "admin_1", true, "Resposta do suporte");
    expect(tickets.setStatus).toHaveBeenCalledWith("ticket_1", "answered");
    expect(dispatch.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientUserIds: ["user_1"],
        type: "support_reply",
        ticketId: "ticket_1",
      }),
    );
  });
});
