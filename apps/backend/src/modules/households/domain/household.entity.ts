export type HouseholdRole = "owner" | "member";

export interface HouseholdEntityProps {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  role: HouseholdRole;
  /** Módulos liberados (só relevante p/ employee; owner = acesso total). */
  permissions: string[];
  /** Fuso IANA do lar (M12) — âncora dos disparos por data e do mês corrente. */
  timezone: string;
  /** Hora local (0–23) a partir da qual lembrete/relatório podem sair (M12). */
  notificationHour: number;
  createdAt: Date;
  updatedAt: Date;
}

export class HouseholdEntity {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly logoUrl: string | null;
  readonly role: HouseholdRole;
  readonly permissions: string[];
  readonly timezone: string;
  readonly notificationHour: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: HouseholdEntityProps) {
    this.id = props.id;
    this.name = props.name;
    this.slug = props.slug;
    this.logoUrl = props.logoUrl;
    this.role = props.role;
    this.permissions = props.permissions ?? [];
    this.timezone = props.timezone;
    this.notificationHour = props.notificationHour;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: HouseholdEntityProps): HouseholdEntity {
    return new HouseholdEntity(props);
  }
}
