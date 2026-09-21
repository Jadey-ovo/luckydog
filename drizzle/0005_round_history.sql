CREATE TABLE `room_draws` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`room_id` text NOT NULL,
	`timestamp` real NOT NULL,
	`winners` text NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `room_draws_timestamp` ON `room_draws` (`room_id`,`timestamp`);--> statement-breakpoint
ALTER TABLE `rooms` ADD `archived` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
-- Retain the last saved round when upgrading; older overwritten rounds cannot be recovered.
INSERT INTO room_draws (room_id, timestamp, winners)
SELECT id, result_timestamp, result_winners FROM rooms
WHERE result_winners IS NOT NULL AND result_timestamp IS NOT NULL;
--> statement-breakpoint
-- The round and the room result commit in the same database write.
CREATE TRIGGER record_room_draw AFTER UPDATE OF result_timestamp, result_winners ON rooms
WHEN NEW.result_winners IS NOT NULL AND NEW.result_timestamp IS NOT NULL
AND (OLD.result_timestamp IS NULL OR NEW.result_timestamp > OLD.result_timestamp)
BEGIN
  INSERT INTO room_draws (room_id, timestamp, winners)
  VALUES (NEW.id, NEW.result_timestamp, NEW.result_winners);
END;
--> statement-breakpoint
-- Archived invitations stay readable, but cannot accept new participants.
CREATE TRIGGER archived_registration_guard BEFORE INSERT ON participants
WHEN EXISTS (SELECT 1 FROM rooms WHERE id = NEW.room_id AND archived = 1)
BEGIN
  SELECT RAISE(ABORT, 'ROOM_CLOSED');
END;
