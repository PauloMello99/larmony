import { IsEnum } from "class-validator";

export class UpdateMemberRoleDto {
  @IsEnum(["owner", "member"], {
    message: "role must be owner or employee",
  })
  role!: "owner" | "member";
}
