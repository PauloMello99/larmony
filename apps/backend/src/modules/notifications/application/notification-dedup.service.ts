import { Inject, Injectable } from "@nestjs/common";
import type { NotificationType } from "../domain/notification.entity";
import {
  INotificationDedupRepository,
  NOTIFICATION_DEDUP_REPOSITORY,
} from "../domain/notification-dedup.repository.interface";

/**
 * Fachada fina sobre `notification_dedup` para outros módulos (goals,
 * budgets, reports, scheduled-transactions) reivindicarem o disparo de um
 * evento ANTES de chamar o dispatcher — nunca por usuário, sempre por
 * household+evento+contexto (dedup é household-scoped; o fan-out por
 * destinatário é ortogonal e resolvido pelo dispatcher).
 */
@Injectable()
export class NotificationDedupService {
  constructor(
    @Inject(NOTIFICATION_DEDUP_REPOSITORY)
    private readonly repo: INotificationDedupRepository,
  ) {}

  /** `true` = ninguém disparou ainda (e este chamador acabou de reivindicar — pode notificar). */
  claim(
    householdId: string,
    eventType: NotificationType,
    contextId: string,
    periodKey: string,
  ): Promise<boolean> {
    return this.repo.tryClaim(householdId, eventType, contextId, periodKey);
  }
}
