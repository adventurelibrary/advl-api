INSERT INTO users (id, username, email, last_seen, join_date) VALUES
('cd240b82-6e33-48e7-a561-eac54bfb1a6b', 'test-user-01', 'test+1@adventurelibrary.art', NOW(), '2021-05-16');

INSERT INTO creators (id, name) VALUES
('9dd2096c-54e6-4eca-a08b-cb6e6fa5a2a1', 'Adventure Library');

INSERT INTO assets (id, slug, name, filetype, original_file_ext, creator_id, size_in_bytes, uploaded, visibility, unlock_count, description, category, tags, unlock_price, revenue_share)
VALUES ('7fa4da69-739d-4e32-a107-1f0bfd4a544b', 'asset-tester', 'Asset Tester', 'IMAGE', 'PNG', '9dd2096c-54e6-4eca-a08b-cb6e6fa5a2a1', 123, NOW(), 'PUBLIC', 1, 'Description pending', 'map', '{}', 50, '{}');

