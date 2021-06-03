INSERT INTO users (id, username, email, last_seen, join_date, is_admin) VALUES
('cd240b82-6e33-48e7-a561-eac54bfb1a6b', 'test-user-01', 'test+1@adventurelibrary.art', NOW(), '2021-05-16', false),
('147ca904-ce80-4154-9f90-8f50243c21b5', 'test-admin-1', 'vindexus+admin@gmail.com', NOW(), '2021-05-14', true);

INSERT INTO creators (id, name, slug) VALUES
('9dd2096c-54e6-4eca-a08b-cb6e6fa5a2a1', 'Adventure Library', 'advl'),
('224d9090-2c19-4d3c-b43d-b101d4879a3b', 'Gerrin Tramis', 'gerrin-tramis'),
('7bffd388-aba7-4bd2-8472-b63fef449805', 'Carlos Cara Alvarez', 'carlos-cara-alvarez');

INSERT INTO assets (id, slug, name, filetype, original_file_ext, creator_id, size_in_bytes, uploaded, visibility, unlock_count, description, category, tags, unlock_price, revenue_share)
VALUES ('7fa4da69-739d-4e32-a107-1f0bfd4a544b', 'asset-tester', 'Asset Tester', 'IMAGE', 'PNG', '9dd2096c-54e6-4eca-a08b-cb6e6fa5a2a1', 123, NOW(), 'PUBLIC', 1, 'Description pending', 'map', '{}', 50, '{}'),
('spxlFPL8WNSAmwL07b0e4su2Wa1EEZzw', 'carlos-cara-alvarez-mutante', 'Mutante', 'IMAGE', 'UNKNOWN', '7bffd388-aba7-4bd2-8472-b63fef449805', 0, '2021-06-04 02:45:11', 'PUBLIC', 0, '', 'character', '{}', 0, '{}');
