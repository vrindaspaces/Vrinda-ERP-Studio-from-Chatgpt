CREATE TABLE `erp_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`platform_email` text NOT NULL,
	`expires_at` integer NOT NULL
);
