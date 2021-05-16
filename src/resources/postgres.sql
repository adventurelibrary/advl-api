create type visibility_types as ENUM ('PENDING', 'HIDDEN', 'PUBLIC', 'ALL');
create type filetypes as ENUM ('IMAGE', 'PDF', 'ZIP');

DROP TABLE IF EXISTS Assets;
create table Assets (
  id TEXT NOT NULL UNIQUE PRIMARY KEY,
  slug TEXT NOT NULL,
  sizeInBytes int NOT NULL,
  uploaded TIMESTAMP NOT NULL,
  visibility visibility_types NOT NULL,
  unlockcount int NOT NULL DEFAULT 0,
  filetype filetypes NOT NULL,
  originalFileExt TEXT NOT NULL,
  creatorname TEXT NOT NULL,

  name TEXT NOT NULL,
  description TEXT NOT NULL,
  collectionID TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT[],
  unlockprice int NOT NULL DEFAULT 0,
  revenueshare JSON DEFAULT '{}'::jsonb
);

create table Users (
  id TEXT NOT NULL UNIQUE PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  notification_preferences JSON DEFAULT '{}'::jsonb,
  last_seen TIMESTAMP NOT NULL,
  join_date TIMESTAMP NOT NULL
);

create UNIQUE INDEX users_name ON Users(username);
create UNIQUE INDEX users_email ON Users(email);

create table Creators (
  id TEXT NOT NULL UNIQUE PRIMARY KEY,
  owner_id TEXT NULL,
  description TEXT,
  CONSTRAINT fk_owner FOREIGN KEY (owner_id) REFERENCES Users(id)
);

create table Administrators (
  id TEXT NOT NULL UNIQUE PRIMARY KEY,
  admin_name TEXT NOT NULL,
  email TEXT NOT NULL,
  user_id TEXT NOT NULL,
  CONSTRAINT fk_owner FOREIGN KEY (user_id) REFERENCES Users(id)
);
