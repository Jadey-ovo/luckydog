-- A saved draw is not the end of an activity. Keep migrated result rooms alive
-- briefly so an open host page can renew them; closed host pages settle as ended.
UPDATE rooms
SET active_until = MIN(expires, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) + 90000)
WHERE archived = 0 AND result_winners IS NOT NULL AND active_until IS NULL;
