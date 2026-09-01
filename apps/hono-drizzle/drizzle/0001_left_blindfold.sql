CREATE TABLE "idempotency_records" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "idempotency_records_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"operation" varchar(100) NOT NULL,
	"idempotency_key" varchar(255) NOT NULL,
	"request_hash" varchar(64) NOT NULL,
	"status" varchar(20) NOT NULL,
	"response_status" integer,
	"response_body" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_records_scope_unique" ON "idempotency_records" USING btree ("user_id","operation","idempotency_key");