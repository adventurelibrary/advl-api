DROP TABLE IF EXISTS asset_unlocks CASCADE;
DROP TABLE IF EXISTS entity_coins CASCADE;
DROP TABLE IF EXISTS coin_purchases CASCADE;
DROP TABLE IF EXISTS purchase_webhooks CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS creators CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS creatormembers CASCADE;
DROP TABLE IF EXISTS bundleinfo CASCADE;
DROP TABLE IF EXISTS bundleassets CASCADE;
DROP TABLE IF EXISTS entities CASCADE;

DROP TYPE IF EXISTS visibility;
DROP TYPE IF EXISTS filetype;
DROP TYPE IF EXISTS category;
DROP TYPE IF EXISTS entity_type CASCADE;
DROP TYPE IF EXISTS visibility CASCADE;
DROP TYPE IF EXISTS filetype CASCADE;
DROP TYPE IF EXISTS category CASCADE;
DROP TYPE IF EXISTS purchase_status CASCADE;
DROP TYPE IF EXISTS payment_provider CASCADE;

create type visibility as ENUM ('PENDING', 'HIDDEN', 'PUBLIC', 'ALL');
create type filetype as ENUM ('IMAGE', 'PDF', 'ZIP');
create type category as ENUM ('map', 'token', 'character', 'scene', 'item', 'panel');
create type entity_type as ENUM ('CREATOR', 'USER', 'ADMIN');

create table entities (
  id TEXT NOT NULL PRIMARY KEY,
  type entity_type NOT NULL
);

create table users (
  id TEXT NOT NULL UNIQUE PRIMARY KEY,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  notification_preferences JSON DEFAULT '{}'::jsonb,
  last_seen TIMESTAMP NOT NULL,
  join_date TIMESTAMP NOT NULL,
  CONSTRAINT fk_entity_id FOREIGN KEY (id) REFERENCES entities(id)
);

create UNIQUE INDEX users_username ON users(username);
create UNIQUE INDEX users_email ON users(email);

create table creators (
  id TEXT NOT NULL UNIQUE PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  owner_id TEXT,
  description TEXT,
  CONSTRAINT fk_owner FOREIGN KEY (owner_id) REFERENCES users(id),
  CONSTRAINT fk_entity_id FOREIGN KEY (id) REFERENCES entities(id)
);
CREATE UNIQUE INDEX creators_slug ON creators (slug);

create table assets (
    id TEXT NOT NULL UNIQUE PRIMARY KEY,
    slug TEXT NOT NULL,
    size_in_bytes int NOT NULL,
    uploaded TIMESTAMP NOT NULL,
    visibility visibility NOT NULL,
    unlock_count int NOT NULL DEFAULT 0,
    filetype filetype NOT NULL,
    original_file_ext TEXT NOT NULL,
    creator_id TEXT NOT NULL,
    deleted BOOLEAN NOT NULL DEFAULT false,

    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category category NOT NULL DEFAULT 'map',
    tags TEXT[],
    unlock_price int NOT NULL DEFAULT 0,
    revenue_share JSON DEFAULT '{}'::jsonb,
    CONSTRAINT fk_creator FOREIGN KEY (creator_id) REFERENCES creators(id)
);
CREATE INDEX assets_deleted ON assets(deleted);

create table creatormembers (
  creator_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  CONSTRAINT fk_creator FOREIGN KEY (creator_id) REFERENCES creators(id),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE UNIQUE INDEX creatormembers_id ON creatormembers (creator_id, user_id);

create table bundleinfo (
  id TEXT NOT NULL UNIQUE PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  public BOOLEAN NOT NULL DEFAULT FALSE,
  entity_id TEXT NOT NULL,
  CONSTRAINT fk_entity_id FOREIGN KEY (entity_id) REFERENCES entities(id)
);

create table bundleassets (
  id TEXT NOT NULL,
  asset_id TEXT NOT NULL ,
  time_added TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_bundle_id FOREIGN KEY (id) REFERENCES bundleinfo(id),
  CONSTRAINT fk_asset_id FOREIGN KEY (asset_id) REFERENCES assets(id)
);

CREATE TYPE purchase_status AS ENUM ('pending', 'complete', 'cancelled', 'error');
CREATE TYPE payment_provider AS ENUM ('stripe');

-- A record of a user buying coins with real money
-- The status is pending when the user is intending to pay, but hasn't
-- completed the purchase yet. It is then changed to 'complete' when
-- we get the response
CREATE TABLE coin_purchases (
    id SERIAL PRIMARY KEY,
    cents INT NOT NULL,
    coins INT NOT NULL,
    key TEXT NOT NULL UNIQUE, -- Passed along to Stripe to identify the purchase in the webhook
    note TEXT NOT NULL DEFAULT '',
    provider payment_provider NOT NULL,
    status purchase_status NOT NULL,
    succeeded_date TIMESTAMP,
    user_id TEXT NOT NULL REFERENCES users (id),

    created_date TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX coin_purchases_status ON coin_purchases (status);

-- This table logs all of the webhooks we receive from payment providers
-- It is useful for debugging
CREATE TABLE purchase_webhooks (
    id SERIAL PRIMARY KEY,
    payload jsonb NOT NULL DEFAULT '{}',
    provider payment_provider,
    created_date TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE asset_unlocks (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    asset_id TEXT NOT NULL,
    coins_spent INTEGER NOT NULL,
    created_date TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_asset_id FOREIGN KEY (asset_id) REFERENCES assets(id)
);

CREATE TABLE entity_coins (
    id SERIAL PRIMARY KEY,
    entity_id TEXT NOT NULL,
    num_coins INTEGER NOT NULL,
    purchase_id INTEGER REFERENCES coin_purchases(id),
    unlock_id INTEGER REFERENCES asset_unlocks(id),
    note TEXT NOT NULL DEFAULT '',
    created_date TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_entity_id FOREIGN KEY (entity_id) REFERENCES entities(id)
);
