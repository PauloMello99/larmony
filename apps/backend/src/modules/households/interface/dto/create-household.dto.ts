import { IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

export class CreateHouseholdDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(80)
  name!: string;
}
