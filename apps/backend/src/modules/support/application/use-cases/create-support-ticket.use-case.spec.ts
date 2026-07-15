import { CreateSupportTicketUseCase } from "./create-support-ticket.use-case";
import type { ISupportTicketRepository } from "../../domain/support-ticket.repository.interface";
import type { SupportTicketDetail } from "../../domain/support-ticket.entity";
import type { DispatchNotificationUseCase } from "../../../notifications/application/use-cases/dispatch-notification.use-case";

function ticket(): SupportTicketDetail {
  return {
    id: "ticket_1",
    userId: "user_1",
    householdId: null,
    category: "question",
    status: "open",
    subject: "Como funciona X?",
    createdAt: new Date(),
    updatedAt: new Date(),
    messages: [],
  };
}

function make() {
  const tickets = {
    create: jest.fn().mockResolvedValue(ticket()),
    findSuperAdminUserIds: jest.fn().mockResolvedValue(["admin_1", "admin_2"]),
  } as unknown as jest.Mocked<ISupportTicketRepository>;
  const dispatch = {
    execute: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<DispatchNotificationUseCase>;
  const uc = new CreateSupportTicketUseCase(tickets, dispatch);
  return { uc, tickets, dispatch };
}

describe("CreateSupportTicketUseCase", () => {
  it("cria o ticket e notifica todos os super_admins", async () => {
    const { uc, tickets, dispatch } = make();

    const result = await uc.execute("user_1", null, "Fulano", {
      category: "question",
      subject: "Como funciona X?",
      body: "Não entendi como usar X.",
    });

    expect(tickets.create).toHaveBeenCalledWith({
      userId: "user_1",
      householdId: null,
      category: "question",
      subject: "Como funciona X?",
      body: "Não entendi como usar X.",
    });
    expect(dispatch.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientUserIds: ["admin_1", "admin_2"],
        type: "support_ticket_created",
        ticketId: "ticket_1",
        authorName: "Fulano",
      }),
    );
    expect(result.id).toBe("ticket_1");
  });

  it("sem super_admin cadastrado → não chama o dispatcher (não quebra a criação)", async () => {
    const { uc, tickets, dispatch } = make();
    tickets.findSuperAdminUserIds.mockResolvedValue([]);

    await uc.execute("user_1", null, "Fulano", {
      category: "problem",
      subject: "Bug",
      body: "Achei um bug.",
    });

    expect(dispatch.execute).not.toHaveBeenCalled();
  });
});
