CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE vin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    email TEXT NOT NULL,
    is_admin BOOLEAN NOT NULL DEFAULT false,
    lastSeen TIMESTAMPTZ,
    password TEXT NOT NULL DEFAULT '',
    username TEXT NOT NULL DEFAULT '' UNIQUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX vin_users_email ON vin_users(email);

CREATE TABLE vin_creators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    description TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL DEFAULT '',
    owner_id UUID NULL REFERENCES vin_users(id) ON DELETE CASCADE,
    slug TEXT NOT NULL DEFAULT '',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE TABLE vin_creator_access (
    creator_id UUID NOT NULL REFERENCES vin_creators(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES vin_users(id) ON DELETE CASCADE
    /* could later add a permission type like 'Owner' or 'Editor'*/
);

CREATE TYPE vin_visibility as ENUM ('PENDING', 'HIDDEN', 'PUBLIC', 'ALL');
CREATE TYPE vin_filetype as ENUM ('IMAGE', 'PDF', 'ZIP');
CREATE TYPE vin_asset_type as ENUM ('MAP', 'TOKEN', 'SCENE', 'CHARACTER');

CREATE TABLE vin_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    archived BOOLEAN NOT NULL DEFAULT FALSE,
    creator_id UUID NOT NULL REFERENCES vin_creators(id) ON DELETE CASCADE,
    description TEXT NOT NULL DEFAULT '',
    file_type vin_filetype NOT NULL NOT NULL DEFAULT 'IMAGE',
    original_file_ext varchar(64) NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    slug TEXT NOT NULL DEFAULT '',
    size_in_bytes int NOT NULL,
    tags TEXT[] NOT NULL DEFAULT '{}',
    type vin_asset_type NULL, /* maybe not null? */
    uploaded_At TIMESTAMPTZ,
    unlock_count int NOT NULL DEFAULT 0,
    visibility vin_visibility NOT NULL DEFAULT 'HIDDEN',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX vin_assets_slug ON vin_assets(slug);
CREATE INDEX vin_assets_archived ON vin_assets(archived);

CREATE TABLE vin_bundles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    archived BOOLEAN NOT NULL DEFAULT FALSE,
    user_id UUID NULL REFERENCES vin_creators(id) ON DELETE CASCADE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);
CREATE INDEX vin_bundles_archived ON vin_bundles(archived);

CREATE TABLE vin_bundle_assets (
    bundle_id UUID NOT NULL REFERENCES vin_bundles(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES vin_assets(id) ON DELETE CASCADE,
    sort INT NOT NULL DEFAULT 1
);
CREATE INDEX vin_bundle_assets_sort ON vin_bundle_assets(sort);

/* Could also make tags its own table, which would allow admins to edit it later
Probably a feature best left for alter
 */
