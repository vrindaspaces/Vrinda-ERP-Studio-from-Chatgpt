CREATE TABLE `erp_drive_folders` (
	`key` text PRIMARY KEY NOT NULL,
	`folder_id` text,
	`lease_until` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `erp_drive_oauth` (
	`id` text PRIMARY KEY NOT NULL,
	`credential` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `erp_drive_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`root_id` text NOT NULL,
	`drive_id` text NOT NULL,
	`email` text NOT NULL,
	`credential` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `erp_drive_states` (
	`hash` text PRIMARY KEY NOT NULL,
	`session_hash` text NOT NULL,
	`credential` text NOT NULL,
	`verifier` text NOT NULL,
	`expires_at` integer NOT NULL
);
