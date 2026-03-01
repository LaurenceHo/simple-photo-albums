-- Migration number: 0001 	 2026-03-01T00:00:00.000Z

ALTER TABLE travel_records ADD COLUMN aircraftType TEXT;
ALTER TABLE travel_records ADD COLUMN durationMinutes INTEGER;
