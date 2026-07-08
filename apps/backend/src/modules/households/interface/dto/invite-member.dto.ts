import { IsEmail, IsEnum, IsOptional } from "class-validator";

export class InviteMemberDto {
  @IsEmail({}, { message: "email must be a valid email address" })
  email!: string;

  /** Default: member (convite típico do lar). Owner precisa ser explícito. */
  @IsOptional()
  @IsEnum(["owner", "member"], {
    message: "role must be owner or member",
  })
  role?: "owner" | "member";
}
