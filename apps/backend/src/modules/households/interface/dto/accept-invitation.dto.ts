import { Equals, IsBoolean, IsNotEmpty, IsString } from "class-validator";

export class AcceptInvitationDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  /**
   * Consentimento explícito de que aceitar o convite expõe os dados
   * financeiros do lar ao aceitante e vice-versa (ToS §3).
   */
  @IsBoolean()
  @Equals(true, {
    message: "É necessário confirmar o compartilhamento de dados financeiros do lar.",
  })
  dataSharingAcknowledged!: boolean;
}
