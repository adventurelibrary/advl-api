BEGIN;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    email TEXT NOT NULL,
    is_admin BOOLEAN NOT NULL DEFAULT false,
    lastSeen TIMESTAMPTZ,
    password TEXT NOT NULL DEFAULT '',
    username TEXT NOT NULL DEFAULT '' UNIQUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX users_email ON users(email);

CREATE TABLE creators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    description TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL DEFAULT '',
    slug TEXT NOT NULL DEFAULT '',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE TABLE creator_access (
    creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
    /* could later add a permission type like 'Owner' or 'Editor'*/
);

CREATE TYPE visibility as ENUM ('PENDING', 'HIDDEN', 'PUBLIC', 'ALL');
CREATE TYPE filetype as ENUM ('IMAGE', 'PDF', 'ZIP');
CREATE TYPE asset_type as ENUM ('MAP', 'TOKEN', 'SCENE', 'CHARACTER');

CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    archived BOOLEAN NOT NULL DEFAULT FALSE,
    creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
    description TEXT NOT NULL DEFAULT '',
    file_type filetype NOT NULL NOT NULL DEFAULT 'IMAGE',
    original_file_ext varchar(64) NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    slug TEXT NOT NULL DEFAULT '',
    size_in_bytes int NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    type asset_type NULL, /* maybe not null? */
    uploaded_At TIMESTAMPTZ,
    unlock_count int NOT NULL DEFAULT 0,
    visibility visibility NOT NULL DEFAULT 'HIDDEN',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX assets_slug ON assets(slug);
CREATE INDEX assets_archived ON assets(archived);

CREATE TABLE bundles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    archived BOOLEAN NOT NULL DEFAULT FALSE,
    user_id UUID NULL REFERENCES creators(id) ON DELETE CASCADE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);
CREATE INDEX bundles_archived ON bundles(archived);

CREATE TABLE bundle_assets (
    bundle_id UUID NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    sort INT NOT NULL DEFAULT 1
);
CREATE INDEX bundle_assets_sort ON bundle_assets(sort);

/* Could also make tags its own table, which would allow admins to edit it later
Probably a feature best left for alter
 */
COMMIT;
