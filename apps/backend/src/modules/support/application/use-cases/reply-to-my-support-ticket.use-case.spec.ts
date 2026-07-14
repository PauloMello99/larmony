import { ReplyToMySupportTicketUseCase } from "./reply-to-my-support-ticket.use-case";
import { SupportTicketNotFoundException } from "../../domain/exceptions/support-ticket-not-found.exception";
import { SupportTicketClosedException } from "../../domain/exceptions/support-ticket-closed.exception";
import type { ISupportTicketRepository } from "../../domain/support-ticket.repository.interface";
import type { SupportTicketDetail, SupportTicketStatus } from "../../domain/support-ticket.entity";

function ticket(status: SupportTicketStatus): SupportTicketDetail {
  return {
    id: "ticket_1",
    userId: "user_1",
    householdId: null,
    category: "question",
    status,
    subject: "Dúvida",
    createdAt: new Date(),
    updatedAt: new Date(),
    messages: [],
  };
}

function make() {
  const tickets = {
    findByIdForUser: jest.fn(),
    addMessage: jest.fn().mockResolvedValue({
      id: "msg_1",
      authorUserId: "user_1",
      authorName: "Fulano",
      isAdmin: false,
      body: "Resposta",
      createdAt: new Date(),
    }),
    setStatus: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<ISupportTicketRepository>;
  const uc = new ReplyToMySupportTicketUseCase(tickets);
  return { uc, tickets };
}

describe("ReplyToMySupportTicketUseCase", () => {
  it("ticket de outro usuário (ou inexistente) → 404, não vaza existência", async () => {
    const { uc, tickets } = make();
    tickets.findByIdForUser.mockResolvedValue(null);

    await expect(uc.execute("ticket_1", "user_1", "Resposta")).rejects.toBeInstanceOf(
      SupportTicketNotFoundException,
    );
  });

  it("ticket fechado → 409, não grava mensagem", async () => {
    const { uc, tickets } = make();
    tickets.findByIdForUser.mockResolvedValue(ticket("closed"));

    await expect(uc.execute("ticket_1", "user_1", "Resposta")).rejects.toBeInstanceOf(
      SupportTicketClosedException,
    );
    expect(tickets.addMessage).not.toHaveBeenCalled();
  });

  it("ticket 'answered' → grava mensagem e reabre para 'open'", async () => {
    const { uc, tickets } = make();
    tickets.findByIdForUser.mockResolvedValue(ticket("answered"));

    await uc.execute("ticket_1", "user_1", "Resposta");

    expect(tickets.addMessage).toHaveBeenCalledWith("ticket_1", "user_1", false, "Resposta");
    expect(tickets.setStatus).toHaveBeenCalledWith("ticket_1", "open");
  });

  it("ticket 'open' → grava mensagem, não mexe no status", async () => {
    const { uc, tickets } = make();
    tickets.findByIdForUser.mockResolvedValue(ticket("open"));

    await uc.execute("ticket_1", "user_1", "Resposta");

    expect(tickets.addMessage).toHaveBeenCalled();
    expect(tickets.setStatus).not.toHaveBeenCalled();
  });
});
