CREATE TABLE `fx_reference_cache` (
	`pair` text PRIMARY KEY NOT NULL,
	`snapshot` text,
	`checked_at` integer DEFAULT 0 NOT NULL,
	`attempted_at` integer DEFAULT 0 NOT NULL,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`lease_token` text,
	`last_error` integer DEFAULT 0 NOT NULL
);
