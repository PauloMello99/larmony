-- Canal de suporte in-app (M15 PR3): tickets threaded usuário<->super_admin.
-- Sem RLS de propósito (mesmo padrão de `notifications`/`billing_invoice_events`)
-- — acesso sempre escopado no código: usuário só enxerga os próprios tickets
-- (WHERE user_id), admin enxerga todos via PlatformAdminGuard.
CREATE TYPE "public"."support_ticket_status" AS ENUM ('open', 'answered', 'closed');
--> statement-breakpoint

CREATE TYPE "public"."support_ticket_category" AS ENUM ('problem', 'question', 'suggestion', 'billing');
--> statement-breakpoint

CREATE TABLE "support_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"household_id" uuid,
	"category" "support_ticket_category" NOT NULL,
	"status" "support_ticket_status" DEFAULT 'open' NOT NULL,
	"subject" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "support_ticket_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"author_user_id" uuid NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX "support_tickets_user_id_idx" ON "support_tickets" USING btree ("user_id");
--> statement-breakpoint

CREATE INDEX "support_tickets_status_idx" ON "support_tickets" USING btree ("status");
--> statement-breakpoint

CREATE INDEX "support_ticket_messages_ticket_id_idx" ON "support_ticket_messages" USING btree ("ticket_id");
--> statement-breakpoint

-- Dois eventos novos no dispatcher de notificações (M11): aviso ao super_admin
-- quando um ticket é aberto, e ao autor quando o admin responde.
ALTER TYPE "public"."notification_type" ADD VALUE 'support_ticket_created';
--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'support_reply';
