-- Migration number: 0000 	 2025-12-04T00:00:00.000Z

CREATE TABLE albums (
  id TEXT PRIMARY KEY,
  year TEXT NOT NULL,
  albumName TEXT NOT NULL,
  description TEXT,
  albumCover TEXT,
  isPrivate INTEGER NOT NULL CHECK (isPrivate IN (0, 1)),
  isFeatured INTEGER CHECK (isFeatured IN (0, 1)),
  place TEXT CHECK (json_valid(place)),
  createdAt TEXT NOT NULL,
  createdBy TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  updatedBy TEXT NOT NULL
) STRICT;

CREATE TABLE album_tags (
  tag TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL,
  createdBy TEXT NOT NULL
) STRICT;

CREATE TABLE album_tags_map (
  albumId TEXT NOT NULL,
  tag TEXT NOT NULL,
  FOREIGN KEY (albumId) REFERENCES albums(id) ON DELETE CASCADE,
  FOREIGN KEY (tag) REFERENCES album_tags(tag) ON DELETE CASCADE,
  PRIMARY KEY (albumId, tag)
);

CREATE TABLE travel_records (
  id TEXT PRIMARY KEY,
  travelDate TEXT NOT NULL,
  departure TEXT NOT NULL CHECK (json_valid(departure)),
  destination TEXT NOT NULL CHECK (json_valid(destination)),
  transportType TEXT NOT NULL,
  airline TEXT,
  flightNumber TEXT,
  distance INTEGER NOT NULL,
  createdAt TEXT NOT NULL,
  createdBy TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  updatedBy TEXT NOT NULL
) STRICT;

CREATE TABLE user_permissions (
  uid TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  displayName TEXT NOT NULL,
  role TEXT NOT NULL
);

INSERT INTO user_permissions (uid, email, displayName, role)
VALUES ('test-uid-1', 'test@example.com', 'Test User', 'admin');

INSERT INTO travel_records (id, travelDate, departure, destination, transportType, flightNumber, distance, createdAt, createdBy, updatedAt, updatedBy, airline)
VALUES (
  '14257dd6-6e41-408d-b3e2-691ceb946591',
  '2025-10-31T11:00:00.000Z',
  '{"displayName":"Tokyo","formattedAddress":"Tokyo, Japan","location":{"latitude":35.6764225,"longitude":139.650027}}',
  '{"displayName":"Los Angeles","formattedAddress":"Los Angeles, CA, USA","location":{"latitude":34.0549076,"longitude":-118.24264299999999}}',
  'flight',
  NULL,
  8819,
  '2025-11-21T21:28:19.883Z',
  'test@example.com',
  '2025-11-21T21:28:19.878Z',
  'test@example.com',
  NULL
);

INSERT INTO albums (id, year, albumName, description, albumCover, isPrivate, isFeatured, place, createdAt, createdBy, updatedAt, updatedBy)
VALUES (
  'demo-album',
  '2024',
  '2024 demo album name',
  'Some test photos',
  null,
  0,
  1,
  '{"formattedAddress":"Tokyo, Japan","displayName":"Tokyo","location":{"latitude":35.6764225,"longitude":139.650027}}',
  '2024-05-08T09:49:48.407Z',
  'test@example.com',
  '2024-07-21T08:50:49.339Z',
  'test@example.com'
);
