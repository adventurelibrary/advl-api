create type visibility_types as ENUM ('PENDING', 'HIDDEN', 'PUBLIC', 'ALL');
create type filetypes as ENUM ('IMAGE', 'PDF', 'ZIP');

create table Assets (
  id TEXT NOT NULL UNIQUE PRIMARY KEY,
  slug TEXT NOT NULL,
  sizeInBytes int NOT NULL,
  uploaded TIMESTAMP NOT NULL,
  visibility visibility_types NOT NULL,
  unlock_count int NOT NULL DEFAULT 0,
  file_type filetypes NOT NULL,
  originalFileExt TEXT NOT NULL,
  creator_name TEXT NOT NULL,

  name TEXT NOT NULL,
  description TEXT NOT NULL,
  collectionID TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT[],
  unlock_price int NOT NULL DEFAULT 0,
  revenue_share JSON DEFAULT '{}'::jsonb
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
  owner TEXT NOT NULL,
  description TEXT,
  CONSTRAINT fk_owner FOREIGN KEY (owner) REFERENCES Users(id)
);

create table Administrators (
  id TEXT NOT NULL UNIQUE PRIMARY KEY,
  admin_name TEXT NOT NULL,
  email TEXT NOT NULL,
  user_id TEXT NOT NULL,
  CONSTRAINT fk_owner FOREIGN KEY (user_id) REFERENCES Users(id)
);