CREATE TABLE `erp_mail_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`recipient_id` text NOT NULL,
	`recipient_email` text NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`sent_at` integer,
	`error` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `erp_mail_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`sender` text NOT NULL,
	`password` text NOT NULL
);
