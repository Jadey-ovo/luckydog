CREATE TABLE rooms (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  open INTEGER NOT NULL DEFAULT 1 CHECK (open IN (0, 1)),
  join_expires INTEGER NOT NULL,
  expires INTEGER NOT NULL
);
CREATE INDEX rooms_expiry ON rooms(expires);
CREATE TABLE participants (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  voter TEXT NOT NULL,
  UNIQUE(room_id, name),
  UNIQUE(room_id, voter)
);
CREATE TABLE results (
  id TEXT PRIMARY KEY,
  winners TEXT NOT NULL,
  timestamp REAL NOT NULL,
  expires INTEGER NOT NULL
);
CREATE INDEX results_expiry ON results(expires);

-- Checks execute inside the same write as the insertion, including when requests race.
CREATE TRIGGER registration_guard BEFORE INSERT ON participants BEGIN
  SELECT RAISE(ABORT, 'ROOM_GONE') WHERE NOT EXISTS (
    SELECT 1 FROM rooms WHERE id = NEW.room_id
      AND expires >= CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)
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
