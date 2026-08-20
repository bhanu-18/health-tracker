ALTER TABLE `foods` ADD `density_g_per_ml` real;--> statement-breakpoint
ALTER TABLE `foods` ADD `is_countable` integer DEFAULT false NOT NULL;