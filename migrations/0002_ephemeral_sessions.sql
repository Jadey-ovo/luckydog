ALTER TABLE results ADD COLUMN owner TEXT;
ALTER TABLE results ADD COLUMN active_until INTEGER;
ALTER TABLE rooms ADD COLUMN active_until INTEGER;

DROP TRIGGER registration_guard;
CREATE TRIGGER registration_guard BEFORE INSERT ON participants BEGIN
  SELECT RAISE(ABORT, 'ROOM_GONE') WHERE NOT EXISTS (
    SELECT 1 FROM rooms WHERE id = NEW.room_id
      AND expires >= CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)
      AND (active_until IS NULL OR active_until >= CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
  );
  SELECT RAISE(ABORT, 'ROOM_CLOSED') WHERE EXISTS (
    SELECT 1 FROM rooms WHERE id = NEW.room_id AND (open = 0
      OR join_expires <= CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
  );
  SELECT RAISE(ABORT, 'VOTER_DUPLICATE') WHERE EXISTS (
    SELECT 1 FROM participants WHERE room_id = NEW.room_id AND voter = NEW.voter
  );
  SELECT RAISE(ABORT, 'NAME_DUPLICATE') WHERE EXISTS (
    SELECT 1 FROM participants WHERE room_id = NEW.room_id AND name = NEW.name
  );
  SELECT RAISE(ABORT, 'ROOM_FULL') WHERE (
    SELECT COUNT(*) FROM participants WHERE room_id = NEW.room_id
  ) >= 5000;
END;
