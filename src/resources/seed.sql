INSERT INTO entities (id, type) VALUES
('cd240b82-6e33-48e7-a561-eac54bfb1a6b','USER'),
('349b984e-8e2e-4a4b-993b-34df19189dbf','USER'),
('147ca904-ce80-4154-9f90-8f50243c21b5','USER'),
('9dd2096c-54e6-4eca-a08b-cb6e6fa5a2a1', 'CREATOR'),
('224d9090-2c19-4d3c-b43d-b101d4879a3b', 'CREATOR'),
('7bffd388-aba7-4bd2-8472-b63fef449805', 'CREATOR');

INSERT INTO users (id, username, email, last_seen, join_date, is_admin) VALUES
('cd240b82-6e33-48e7-a561-eac54bfb1a6b', 'test-user-01', 'test+1@adventurelibrary.art', NOW(), '2021-05-16', false),
('349b984e-8e2e-4a4b-993b-34df19189dbf', 'test-creator-1', 'vindexus+creator1@gmail.com', NOW(), '2021-06-06', false),
('147ca904-ce80-4154-9f90-8f50243c21b5', 'test-admin-1', 'vindexus+admin@gmail.com', NOW(), '2021-05-14', true);

INSERT INTO creators (id, name, slug, owner_id) VALUES
('9dd2096c-54e6-4eca-a08b-cb6e6fa5a2a1', 'Adventure Library', 'advl', null),
('224d9090-2c19-4d3c-b43d-b101d4879a3b', 'Gerrin Tramis', 'gerrin-tramis', '349b984e-8e2e-4a4b-993b-34df19189dbf'),
('7bffd388-aba7-4bd2-8472-b63fef449805', 'Carlos Cara Alvarez', 'carlos-cara-alvarez', null);

INSERT INTO assets (id, slug, name, filetype, original_file_ext, creator_id, size_in_bytes, uploaded, visibility, upload_status, unlock_count, description, category, tags, unlock_price, revenue_share)
VALUES ('7fa4da69-739d-4e32-a107-1f0bfd4a544b', 'asset-tester', 'Asset Tester', 'IMAGE', 'PNG', '9dd2096c-54e6-4eca-a08b-cb6e6fa5a2a1', 123, NOW(), 'PUBLIC', 'COMPLETE', 1, 'Description pending', 'map', '{}', 50, '{}'),
('spxlFPL8WNSAmwL07b0e4su2Wa1EEZzw', 'carlos-cara-alvarez-mutante', 'Mutante', 'IMAGE', 'UNKNOWN', '7bffd388-aba7-4bd2-8472-b63fef449805', 0, '2021-06-04 02:45:11', 'PUBLIC', 'COMPLETE', 0, '', 'character', '{"Barbarian"}', 0, '{}'),
('caiQ4wQRlXFiOtMrCO2D86gX1odpqeuj', 'house', 'House', 'IMAGE', 'jpg', '224d9090-2c19-4d3c-b43d-b101d4879a3b', 2875969, '2021-06-03 17:33:25', 'PUBLIC', 'COMPLETE', 0, '', 'map', '{"House", "Barbarian"}', 0, '{}'),
('B0k0MsxaS8nvTMbndBvvAEsBnyL0I6vx','first-kill','First Kill', 'IMAGE','jpg','224d9090-2c19-4d3c-b43d-b101d4879a3b',3711875, '2021-06-03 12:42:06', 'PUBLIC', 'COMPLETE',0, '', 'map','{}',50,'{}'),
('CTgHDPNAjeRpdPYg89WeDYwqa5pXcEC2','killion','Killion','IMAGE','jpg','224d9090-2c19-4d3c-b43d-b101d4879a3b',2939370,'2021-06-03 12:42:13','HIDDEN', 'COMPLETE',0,'','character','{}',50,'{}'),
('DCjzmGvBbMYux64dhLbWeBMpgbDOgrbm','hope-keyshot','Hope Keyshot','IMAGE','jpg','224d9090-2c19-4d3c-b43d-b101d4879a3b',2491374,'2021-06-03 19:42:18','HIDDEN', 'COMPLETE',0,'','scene','{}',0,'{}');

INSERT INTO bundleinfo (id, name, description, entity_id, public) VALUES
('083e16ae-8f1d-4fd8-af48-e71bf757efd2', 'My Public Bundle', 'This is where I keep my bundles', 'cd240b82-6e33-48e7-a561-eac54bfb1a6b', true),
('a672b690-8027-47e5-889c-ef19f78d9a7d', 'My Private Bundle', '', 'cd240b82-6e33-48e7-a561-eac54bfb1a6b', false);

INSERT INTO creatormembers (creator_id, user_id) VALUES ('224d9090-2c19-4d3c-b43d-b101d4879a3b', '349b984e-8e2e-4a4b-993b-34df19189dbf');

insert into bundleinfo (id, name, description, public, entity_id) values ('0ZqVg1MSpHFSkyvj9yWAyDfC1sjwQAxQ', 'Bundling Bundles 3', 'The bundliest bundle BY A CREATOR', false, '9dd2096c-54e6-4eca-a08b-cb6e6fa5a2a1');
insert into bundleinfo (id, name, description, public, entity_id) values ('ALJMgJbpNUxzzaGgx1PQzx0RpUNTZziS', 'Bundling Bundles 2', 'The bundliest bundle', false, 'cd240b82-6e33-48e7-a561-eac54bfb1a6b');

INSERT INTO bundleassets (id, asset_id) VALUES
('083e16ae-8f1d-4fd8-af48-e71bf757efd2', 'spxlFPL8WNSAmwL07b0e4su2Wa1EEZzw');

INSERT INTO asset_unlocks (user_id, asset_id, coins_spent, created_date) VALUES
('cd240b82-6e33-48e7-a561-eac54bfb1a6b', 'B0k0MsxaS8nvTMbndBvvAEsBnyL0I6vx', 50, NOW() - INTERVAL '7 DAYS'),
('cd240b82-6e33-48e7-a561-eac54bfb1a6b', 'spxlFPL8WNSAmwL07b0e4su2Wa1EEZzw', 0, NOW() - INTERVAL '1 DAY');

INSERT INTO coin_purchases (id, user_id, cents, coins, key, provider, status, created_date, succeeded_date) VALUES
(1, 'cd240b82-6e33-48e7-a561-eac54bfb1a6b', 500, 500, 'fdafdsa', 'stripe', 'complete', NOW() - INTERVAL '8 DAYS' - INTERVAL '20 MINUTES', NOW() - INTERVAL '8 DAYS'),
(2, 'cd240b82-6e33-48e7-a561-eac54bfb1a6b', 500, 500, 'fdafdsa1', 'stripe', 'complete', NOW() - INTERVAL '620 MINUTES', NOW() - INTERVAL '520 MINUTES'),
(3, 'cd240b82-6e33-48e7-a561-eac54bfb1a6b', 500, 500, 'fdafdsb', 'stripe', 'complete', NOW() - INTERVAL '621 MINUTES', NOW() - INTERVAL '521 MINUTES'),
(4, 'cd240b82-6e33-48e7-a561-eac54bfb1a6b', 500, 500, 'fdafdsc', 'stripe', 'complete', NOW() - INTERVAL '622 MINUTES', NOW() - INTERVAL '522 MINUTES'),
(5, 'cd240b82-6e33-48e7-a561-eac54bfb1a6b', 500, 500, 'fdafdsd', 'stripe', 'complete', NOW() - INTERVAL '625 MINUTES', NOW() - INTERVAL '525 MINUTES'),
(6, 'cd240b82-6e33-48e7-a561-eac54bfb1a6b', 500, 500, 'fdafdse', 'stripe', 'complete', NOW() - INTERVAL '626 MINUTES', NOW() - INTERVAL '526 MINUTES'),
(7, 'cd240b82-6e33-48e7-a561-eac54bfb1a6b', 1000, 1000, 'fdafdsf', 'stripe', 'complete', NOW() - INTERVAL '629 MINUTES', NOW() - INTERVAL '529 MINUTES'),
(8, 'cd240b82-6e33-48e7-a561-eac54bfb1a6b', 500, 500, 'fdafdsg', 'stripe', 'complete', NOW() - INTERVAL '633 MINUTES', NOW() - INTERVAL '533 MINUTES'),
(9, 'cd240b82-6e33-48e7-a561-eac54bfb1a6b', 500, 500, 'fdafdsh', 'stripe', 'complete', NOW() - INTERVAL '644 MINUTES', NOW() - INTERVAL '544 MINUTES'),
(10, 'cd240b82-6e33-48e7-a561-eac54bfb1a6b', 500, 500, 'fdafdsi', 'stripe', 'complete', NOW() - INTERVAL '645 MINUTES', NOW() - INTERVAL '545 MINUTES'),
(11, 'cd240b82-6e33-48e7-a561-eac54bfb1a6b', 500, 500, 'fdafdsj', 'stripe', 'complete', NOW() - INTERVAL '646 MINUTES', NOW() - INTERVAL '546 MINUTES'),
(12, 'cd240b82-6e33-48e7-a561-eac54bfb1a6b', 500, 500, 'fdafdsk', 'stripe', 'pending', NOW() - INTERVAL '647 MINUTES', null),
(13, 'cd240b82-6e33-48e7-a561-eac54bfb1a6b', 500, 500, 'fdafdsl', 'stripe', 'complete', NOW() - INTERVAL '649 MINUTES', NOW() - INTERVAL '549 MINUTES'),
(14, 'cd240b82-6e33-48e7-a561-eac54bfb1a6b', 500, 500, 'fdafdsm', 'stripe', 'complete', NOW() - INTERVAL '650 MINUTES', NOW() - INTERVAL '550 MINUTES'),
(15, 'cd240b82-6e33-48e7-a561-eac54bfb1a6b', 500, 500, 'fdafdsn', 'stripe', 'complete', NOW() - INTERVAL '600 MINUTES', NOW() - INTERVAL '500 MINUTES'),
(16, 'cd240b82-6e33-48e7-a561-eac54bfb1a6b', 500, 500, 'fdafdso', 'stripe', 'pending', NOW() - INTERVAL '600 MINUTES', null),
(17, 'cd240b82-6e33-48e7-a561-eac54bfb1a6b', 500, 500, 'fdafdsp', 'stripe', 'complete', NOW() - INTERVAL '600 MINUTES', NOW() - INTERVAL '500 MINUTES'),
(18, 'cd240b82-6e33-48e7-a561-eac54bfb1a6b', 500, 500, 'fdafds5', 'stripe', 'complete', NOW() - INTERVAL '600 MINUTES', NOW() - INTERVAL '500 MINUTES'),
(19, 'cd240b82-6e33-48e7-a561-eac54bfb1a6b', 500, 500, 'fdafds6', 'stripe', 'complete', NOW() - INTERVAL '600 MINUTES', NOW() - INTERVAL '500 MINUTES'),
(20, 'cd240b82-6e33-48e7-a561-eac54bfb1a6b', 500, 500, 'fdafds7', 'stripe', 'complete', NOW() - INTERVAL '600 MINUTES', NOW() - INTERVAL '500 MINUTES'),
(21, 'cd240b82-6e33-48e7-a561-eac54bfb1a6b', 500, 500, 'fdafds8', 'stripe', 'complete', NOW() - INTERVAL '600 MINUTES', NOW() - INTERVAL '500 MINUTES'),
(22, 'cd240b82-6e33-48e7-a561-eac54bfb1a6b', 500, 500, 'fdafds9', 'stripe', 'complete', NOW() - INTERVAL '600 MINUTES', NOW() - INTERVAL '500 MINUTES'),
(23, 'cd240b82-6e33-48e7-a561-eac54bfb1a6b', 500, 500, 'fdafds0', 'stripe', 'complete', NOW() - INTERVAL '600 MINUTES', NOW() - INTERVAL '500 MINUTES'),
(24, 'cd240b82-6e33-48e7-a561-eac54bfb1a6b', 500, 500, 'fdafds0a', 'stripe', 'complete', NOW() - INTERVAL '600 MINUTES', NOW() - INTERVAL '500 MINUTES'),
(25, 'cd240b82-6e33-48e7-a561-eac54bfb1a6b', 2500, 2500, 'fdafds0c', 'stripe', 'complete', NOW() - INTERVAL '50 MINUTES', NOW() - INTERVAL '45 MINUTES'),
(26, 'cd240b82-6e33-48e7-a561-eac54bfb1a6b', 500, 500, 'fahewuagew', 'stripe', 'pending', NOW() - INTERVAL '7 DAYS', null);

SELECT setval('coin_purchases_id_seq', 26, true);

INSERT INTO entity_coins (entity_id, num_coins, created_date, note, unlock_id, purchase_id) VALUES
('cd240b82-6e33-48e7-a561-eac54bfb1a6b', 500, NOW() - INTERVAL '8 DAYS', 'Bought 500 coins', null, 1),
('cd240b82-6e33-48e7-a561-eac54bfb1a6b', 500, NOW() - INTERVAL '520 DAYS', 'Bought 500 coins', null, 2),
('cd240b82-6e33-48e7-a561-eac54bfb1a6b', 500, NOW() - INTERVAL '521 MINUTES', 'Bought 500 coins', null, 3),
('cd240b82-6e33-48e7-a561-eac54bfb1a6b', 500, NOW() - INTERVAL '522 MINUTES', 'Bought 500 coins', null, 4),
('cd240b82-6e33-48e7-a561-eac54bfb1a6b', 500, NOW() - INTERVAL '525 MINUTES', 'Bought 500 coins', null, 5),
('cd240b82-6e33-48e7-a561-eac54bfb1a6b', 500, NOW() - INTERVAL '526 MINUTES', 'Bought 500 coins', null, 6),
('cd240b82-6e33-48e7-a561-eac54bfb1a6b', 1000, NOW() - INTERVAL '529 MINUTES', 'Bought 1000 coins', null, 7),
('cd240b82-6e33-48e7-a561-eac54bfb1a6b', 500, NOW() - INTERVAL '533 MINUTES', 'Bought 500 coins', null, 8),
('cd240b82-6e33-48e7-a561-eac54bfb1a6b', 500, NOW() - INTERVAL '544 MINUTES', 'Bought 500 coins', null, 9),
('cd240b82-6e33-48e7-a561-eac54bfb1a6b', 500, NOW() - INTERVAL '545 MINUTES', 'Bought 500 coins', null, 10),
('cd240b82-6e33-48e7-a561-eac54bfb1a6b', 500, NOW() - INTERVAL '546 MINUTES', 'Bought 500 coins', null, 11),
('cd240b82-6e33-48e7-a561-eac54bfb1a6b', 500, NOW() - INTERVAL '549 MINUTES', 'Bought 500 coins', null, 13),
('cd240b82-6e33-48e7-a561-eac54bfb1a6b', 500, NOW() - INTERVAL '550 MINUTES', 'Bought 500 coins', null, 14),
('cd240b82-6e33-48e7-a561-eac54bfb1a6b', 500, NOW() - INTERVAL '550 MINUTES', 'Bought 500 coins', null, 15),
('cd240b82-6e33-48e7-a561-eac54bfb1a6b', 500, NOW() - INTERVAL '500 MINUTES', 'Bought 500 coins', null, 17),
('cd240b82-6e33-48e7-a561-eac54bfb1a6b', 500, NOW() - INTERVAL '500 MINUTES', 'Bought 500 coins', null, 18),
('cd240b82-6e33-48e7-a561-eac54bfb1a6b', 500, NOW() - INTERVAL '500 MINUTES', 'Bought 500 coins', null, 19),
('cd240b82-6e33-48e7-a561-eac54bfb1a6b', 500, NOW() - INTERVAL '500 MINUTES', 'Bought 500 coins', null, 20),
('cd240b82-6e33-48e7-a561-eac54bfb1a6b', 500, NOW() - INTERVAL '500 MINUTES', 'Bought 500 coins', null, 21),
('cd240b82-6e33-48e7-a561-eac54bfb1a6b', 500, NOW() - INTERVAL '500 MINUTES', 'Bought 500 coins', null, 22),
('cd240b82-6e33-48e7-a561-eac54bfb1a6b', 500, NOW() - INTERVAL '500 MINUTES', 'Bought 500 coins', null, 23),
('cd240b82-6e33-48e7-a561-eac54bfb1a6b', 500, NOW() - INTERVAL '500 MINUTES', 'Bought 500 coins', null, 24),
('cd240b82-6e33-48e7-a561-eac54bfb1a6b', 2500, NOW() - INTERVAL '45 MINUTES', 'Bought 2500 coins', null, 25),
('cd240b82-6e33-48e7-a561-eac54bfb1a6b', -12500, NOW(), 'Was smited by the coin gods', null, null), -- This is to adjust their coin total to match test expectations
('cd240b82-6e33-48e7-a561-eac54bfb1a6b', -50, NOW() - INTERVAL '6 DAYS', 'Bought an asset', 1, null);
