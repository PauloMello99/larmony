import { Equals, IsBoolean, IsEmail, IsString, MinLength } from "class-validator";

export class SignUpDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  /** Aceite obrigatório dos Termos de Uso/Política de Privacidade (LGPD). */
  @IsBoolean()
  @Equals(true, {
    message: "É necessário aceitar os Termos de Uso e a Política de Privacidade.",
  })
  termsAccepted!: boolean;
}
