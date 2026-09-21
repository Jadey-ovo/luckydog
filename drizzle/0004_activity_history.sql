-- Convert existing v5 invitations from creation + 7 days to creation + 24 hours.
UPDATE rooms SET expires = expires - 6 * 86400000;
-- v5 stored random winner IDs; bind historical winners to their registration identity.
UPDATE rooms SET result_winners = (
  SELECT json_group_array(json_object('id', p.id, 'name', p.name))
  FROM json_each(rooms.result_winners) w JOIN participants p
  ON p.room_id = rooms.id AND p.name = json_extract(w.value, '$.name')
), active_until = NULL WHERE result_winners IS NOT NULL;
DROP TRIGGER registration_guard;
CREATE TRIGGER registration_guard BEFORE INSERT ON participants BEGIN
  SELECT RAISE(ABORT, 'ROOM_GONE') WHERE NOT EXISTS (
    SELECT 1 FROM rooms WHERE id = NEW.room_id
      AND expires > CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)
      AND (active_until IS NULL OR active_until > CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER))
  );
  SELECT RAISE(ABORT, 'ROOM_CLOSED') WHERE EXISTS (
    SELECT 1 FROM rooms WHERE id = NEW.room_id AND (result_winners IS NOT NULL OR open = 0
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
