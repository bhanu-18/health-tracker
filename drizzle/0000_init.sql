CREATE TABLE `food_log_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`slot` text NOT NULL,
	`name` text NOT NULL,
	`servings` real DEFAULT 1 NOT NULL,
	`calories` real NOT NULL,
	`protein_g` real DEFAULT 0 NOT NULL,
	`carbs_g` real DEFAULT 0 NOT NULL,
	`fat_g` real DEFAULT 0 NOT NULL,
	`food_id` text,
	`recipe_id` text,
	`logged_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`food_id`) REFERENCES `foods`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `food_log_entries_date_idx` ON `food_log_entries` (`date`);--> statement-breakpoint
CREATE TABLE `foods` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`name_normalized` text NOT NULL,
	`serving_label` text NOT NULL,
	`serving_grams` real,
	`calories` real NOT NULL,
	`protein_g` real DEFAULT 0 NOT NULL,
	`carbs_g` real DEFAULT 0 NOT NULL,
	`fat_g` real DEFAULT 0 NOT NULL,
	`source` text DEFAULT 'user' NOT NULL,
	`cuisine` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `foods_name_normalized_idx` ON `foods` (`name_normalized`);--> statement-breakpoint
CREATE INDEX `foods_source_idx` ON `foods` (`source`);--> statement-breakpoint
CREATE TABLE `profile` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`daily_calorie_target` integer DEFAULT 2000 NOT NULL,
	`daily_step_goal` integer DEFAULT 10000 NOT NULL,
	`sleep_goal_hours` real DEFAULT 8 NOT NULL,
	`goal_weight_kg` real,
	`protein_target_g` integer,
	`carbs_target_g` integer,
	`fat_target_g` integer,
	`weight_unit` text DEFAULT 'kg' NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recipe_ingredients` (
	`id` text PRIMARY KEY NOT NULL,
	`recipe_id` text NOT NULL,
	`food_id` text,
	`name` text NOT NULL,
	`quantity` real NOT NULL,
	`unit` text NOT NULL,
	`calories` real DEFAULT 0 NOT NULL,
	`protein_g` real DEFAULT 0 NOT NULL,
	`carbs_g` real DEFAULT 0 NOT NULL,
	`fat_g` real DEFAULT 0 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`food_id`) REFERENCES `foods`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `recipe_ingredients_recipe_id_idx` ON `recipe_ingredients` (`recipe_id`);--> statement-breakpoint
CREATE TABLE `recipes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`name_normalized` text NOT NULL,
	`serves` integer DEFAULT 1 NOT NULL,
	`notes` text,
	`cuisine` text,
	`calories_per_serving` real DEFAULT 0 NOT NULL,
	`protein_per_serving_g` real DEFAULT 0 NOT NULL,
	`carbs_per_serving_g` real DEFAULT 0 NOT NULL,
	`fat_per_serving_g` real DEFAULT 0 NOT NULL,
	`source` text DEFAULT 'user' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `recipes_name_normalized_idx` ON `recipes` (`name_normalized`);--> statement-breakpoint
CREATE TABLE `usual_meals` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text,
	`food_id` text,
	`recipe_id` text,
	`servings` real DEFAULT 1 NOT NULL,
	`slot` text,
	`use_count` integer DEFAULT 0 NOT NULL,
	`last_used_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`food_id`) REFERENCES `foods`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `usual_meals_use_count_idx` ON `usual_meals` (`use_count`);--> statement-breakpoint
CREATE UNIQUE INDEX `usual_meals_food_idx` ON `usual_meals` (`food_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `usual_meals_recipe_idx` ON `usual_meals` (`recipe_id`);--> statement-breakpoint
CREATE TABLE `weight_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`kg` real NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`external_id` text,
	`logged_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `weight_entries_date_idx` ON `weight_entries` (`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `weight_entries_external_id_idx` ON `weight_entries` (`external_id`);