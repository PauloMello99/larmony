import { TransactionSplitInvalidException } from "./exceptions/transaction-split-invalid.exception";
import type { TransactionMemberInput } from "./transaction.repository.interface";

/**
 * Valida o rateio de uma transação única:
 * - lista vazia → sem rateio (ok);
 * - todos os shares null → divisão igual (ok);
 * - algum share preenchido → todos preenchidos E soma == amountCents;
 * - membros duplicados → inválido.
 */
export function assertValidSplit(
  members: TransactionMemberInput[],
  amountCents: number,
): void {
  if (members.length === 0) return;

  const uniqueIds = new Set(members.map((m) => m.userId));
  if (uniqueIds.size !== members.length) {
    throw new TransactionSplitInvalidException("Um membro não pode aparecer duas vezes no rateio");
  }

  const withShare = members.filter((m) => m.shareAmountCents !== null);
  if (withShare.length === 0) return; // divisão igual

  if (withShare.length !== members.length) {
    throw new TransactionSplitInvalidException(
      "Defina o valor de todos os membros, ou de nenhum (divisão igual)",
    );
  }

  const sum = withShare.reduce((s, m) => s + (m.shareAmountCents ?? 0), 0);
  if (sum !== amountCents) {
    throw new TransactionSplitInvalidException();
  }
}

/** Parcelamento só aceita rateio igual — valores específicos são rejeitados. */
export function assertEqualSplitOnly(members: TransactionMemberInput[]): void {
  if (members.some((m) => m.shareAmountCents !== null)) {
    throw new TransactionSplitInvalidException(
      "Parcelamento só permite rateio igual (sem valores específicos por membro)",
    );
  }
  const uniqueIds = new Set(members.map((m) => m.userId));
  if (uniqueIds.size !== members.length) {
    throw new TransactionSplitInvalidException("Um membro não pode aparecer duas vezes no rateio");
  }
}
