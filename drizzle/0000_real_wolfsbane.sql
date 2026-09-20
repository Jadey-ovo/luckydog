CREATE TABLE `participants` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`id` text NOT NULL,
	`room_id` text NOT NULL,
	`name` text NOT NULL,
	`voter` text NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `participants_id_unique` ON `participants` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `participants_room_name` ON `participants` (`room_id`,`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `participants_room_voter` ON `participants` (`room_id`,`voter`);--> statement-breakpoint
CREATE TABLE `results` (
	`id` text PRIMARY KEY NOT NULL,
	`winners` text NOT NULL,
	`timestamp` real NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `results_expiry` ON `results` (`expires`);--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`open` integer DEFAULT 1 NOT NULL,
	`join_expires` integer NOT NULL,
	`expires` integer NOT NULL,
	CONSTRAINT "rooms_open_check" CHECK("rooms"."open" IN (0, 1))
);
--> statement-breakpoint
CREATE INDEX `rooms_expiry` ON `rooms` (`expires`);