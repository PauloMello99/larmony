import { IsNotEmpty, IsString } from "class-validator";

export class DeclineInvitationDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}
