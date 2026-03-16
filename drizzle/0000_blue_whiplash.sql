CREATE TABLE "app_api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"key_prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"rpm_limit" integer,
	"tpm_limit" integer,
	"smart_routing" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_budgets" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text,
	"role" text,
	"hard_limit_cents" integer,
	"soft_limit_cents" integer,
	"reset_day" integer DEFAULT 1 NOT NULL,
	"is_org_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_budgets_org_user_unique" UNIQUE("org_id","user_id"),
	CONSTRAINT "app_budgets_org_role_unique" UNIQUE("org_id","role")
);
--> statement-breakpoint
CREATE TABLE "app_email_verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_oauth_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"provider_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_oauth_accounts_provider_user_unique" UNIQUE("provider","provider_user_id")
);
--> statement-breakpoint
CREATE TABLE "app_org_invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"token" text NOT NULL,
	"invited_by" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_org_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "app_org_members" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_org_members_org_user_unique" UNIQUE("org_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "app_organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"litellm_org_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"default_rpm_limit" integer,
	"default_tpm_limit" integer,
	"smart_routing_cheap_model" text,
	"smart_routing_expensive_model" text,
	"cache_ttl_seconds" integer DEFAULT 3600 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "app_password_resets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_provider_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"provider" text NOT NULL,
	"label" text NOT NULL,
	"encrypted_key" text NOT NULL,
	"base_url" text,
	"models" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_provider_keys_org_provider_label_unique" UNIQUE("org_id","provider","label")
);
--> statement-breakpoint
CREATE TABLE "app_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_usage_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"api_key_id" text NOT NULL,
	"model" text NOT NULL,
	"provider" text NOT NULL,
	"endpoint" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cost" numeric(12, 6) DEFAULT '0' NOT NULL,
	"latency_ms" integer,
	"status" text DEFAULT 'success' NOT NULL,
	"is_streaming" boolean DEFAULT false NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"name" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "app_api_keys" ADD CONSTRAINT "app_api_keys_org_id_app_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."app_organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_api_keys" ADD CONSTRAINT "app_api_keys_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_budgets" ADD CONSTRAINT "app_budgets_org_id_app_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."app_organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_budgets" ADD CONSTRAINT "app_budgets_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_email_verifications" ADD CONSTRAINT "app_email_verifications_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_oauth_accounts" ADD CONSTRAINT "app_oauth_accounts_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_org_invitations" ADD CONSTRAINT "app_org_invitations_org_id_app_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."app_organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_org_invitations" ADD CONSTRAINT "app_org_invitations_invited_by_app_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_org_members" ADD CONSTRAINT "app_org_members_org_id_app_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."app_organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_org_members" ADD CONSTRAINT "app_org_members_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_password_resets" ADD CONSTRAINT "app_password_resets_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_provider_keys" ADD CONSTRAINT "app_provider_keys_org_id_app_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."app_organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_sessions" ADD CONSTRAINT "app_sessions_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_usage_logs" ADD CONSTRAINT "app_usage_logs_org_id_app_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."app_organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_usage_logs" ADD CONSTRAINT "app_usage_logs_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_usage_logs" ADD CONSTRAINT "app_usage_logs_api_key_id_app_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."app_api_keys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "app_api_keys_key_hash_idx" ON "app_api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "app_api_keys_org_user_idx" ON "app_api_keys" USING btree ("org_id","user_id");--> statement-breakpoint
CREATE INDEX "app_budgets_org_default_idx" ON "app_budgets" USING btree ("org_id","is_org_default");--> statement-breakpoint
CREATE INDEX "app_oauth_accounts_user_id_idx" ON "app_oauth_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "app_org_invitations_token_idx" ON "app_org_invitations" USING btree ("token");--> statement-breakpoint
CREATE INDEX "app_org_invitations_org_email_idx" ON "app_org_invitations" USING btree ("org_id","email");--> statement-breakpoint
CREATE INDEX "app_organizations_slug_idx" ON "app_organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "app_provider_keys_org_provider_idx" ON "app_provider_keys" USING btree ("org_id","provider");--> statement-breakpoint
CREATE INDEX "app_sessions_user_id_idx" ON "app_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "app_usage_logs_org_created_idx" ON "app_usage_logs" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE INDEX "app_usage_logs_user_created_idx" ON "app_usage_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "app_usage_logs_org_model_idx" ON "app_usage_logs" USING btree ("org_id","model");--> statement-breakpoint
CREATE INDEX "app_users_email_idx" ON "app_users" USING btree ("email");