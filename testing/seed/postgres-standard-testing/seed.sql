INSERT INTO users (id, username, email, last_seen, join_date, is_admin) VALUES
('cd240b82-6e33-48e7-a561-eac54bfb1a6b', 'test-user-01', 'test+1@adventurelibrary.art', NOW(), '2021-05-16', false),
('349b984e-8e2e-4a4b-993b-34df19189dbf', 'test-creator-1', 'vindexus+creator1@gmail.com', NOW(), '2021-06-06', false),
('147ca904-ce80-4154-9f90-8f50243c21b5', 'test-admin-1', 'vindexus+admin@gmail.com', NOW(), '2021-05-14', true);

INSERT INTO creators (id, name, slug, owner_id) VALUES
('9dd2096c-54e6-4eca-a08b-cb6e6fa5a2a1', 'Adventure Library', 'advl', null),
('224d9090-2c19-4d3c-b43d-b101d4879a3b', 'Gerrin Tramis', 'gerrin-tramis', '349b984e-8e2e-4a4b-993b-34df19189dbf'),
('7bffd388-aba7-4bd2-8472-b63fef449805', 'Carlos Cara Alvarez', 'carlos-cara-alvarez', null);

INSERT INTO assets (id, slug, name, filetype, original_file_ext, creator_id, size_in_bytes, uploaded, visibility, unlock_count, description, category, tags, unlock_price, revenue_share)
VALUES ('7fa4da69-739d-4e32-a107-1f0bfd4a544b', 'asset-tester', 'Asset Tester', 'IMAGE', 'PNG', '9dd2096c-54e6-4eca-a08b-cb6e6fa5a2a1', 123, NOW(), 'PUBLIC', 1, 'Description pending', 'map', '{}', 50, '{}'),
('spxlFPL8WNSAmwL07b0e4su2Wa1EEZzw', 'carlos-cara-alvarez-mutante', 'Mutante', 'IMAGE', 'UNKNOWN', '7bffd388-aba7-4bd2-8472-b63fef449805', 0, '2021-06-04 02:45:11', 'PUBLIC', 0, '', 'character', '{"Barbarian"}', 0, '{}'),
('caiQ4wQRlXFiOtMrCO2D86gX1odpqeuj', 'house', 'House', 'IMAGE', 'jpg', '224d9090-2c19-4d3c-b43d-b101d4879a3b', 2875969, '2021-06-03 17:33:25', 'PUBLIC', 0, '', 'map', '{"House", "Barbarian"}', 0, '{}'),
('B0k0MsxaS8nvTMbndBvvAEsBnyL0I6vx','first-kill','First Kill', 'IMAGE','jpg','224d9090-2c19-4d3c-b43d-b101d4879a3b',3711875, '2021-06-03 12:42:06', 'PUBLIC',0, '', 'map','{}',0,'{}'),
('CTgHDPNAjeRpdPYg89WeDYwqa5pXcEC2','killion','Killion','IMAGE','jpg','224d9090-2c19-4d3c-b43d-b101d4879a3b',2939370,'2021-06-03 12:42:13','HIDDEN',0,'','character','{}',0,'{}'),
('DCjzmGvBbMYux64dhLbWeBMpgbDOgrbm','hope-keyshot','Hope Keyshot','IMAGE','jpg','224d9090-2c19-4d3c-b43d-b101d4879a3b',2491374,'2021-06-03 19:42:18','HIDDEN',0,'','scene','{}',0,'{}');

INSERT INTO bundleinfo (id, name, description, user_id, public) VALUES
('083e16ae-8f1d-4fd8-af48-e71bf757efd2', 'My Public Bundle', 'This is where I keep my bundles', 'cd240b82-6e33-48e7-a561-eac54bfb1a6b', true),
('a672b690-8027-47e5-889c-ef19f78d9a7d', 'My Private Bundle', '', 'cd240b82-6e33-48e7-a561-eac54bfb1a6b', false);

INSERT INTO creatormembers (creator_id, user_id) VALUES ('224d9090-2c19-4d3c-b43d-b101d4879a3b', '349b984e-8e2e-4a4b-993b-34df19189dbf');

insert into bundleinfo (id, name, description, public, creator_id, user_id) values ('0ZqVg1MSpHFSkyvj9yWAyDfC1sjwQAxQ', 'Bundling Bundles 3', 'The bundliest bundle BY A CREATOR', false, '9dd2096c-54e6-4eca-a08b-cb6e6fa5a2a1', null);
insert into bundleinfo (id, name, description, public, creator_id, user_id) values ('ALJMgJbpNUxzzaGgx1PQzx0RpUNTZziS', 'Bundling Bundles 2', 'The bundliest bundle', false, null, 'cd240b82-6e33-48e7-a561-eac54bfb1a6b');

INSERT INTO bundleassets (id, asset_id) VALUES
('083e16ae-8f1d-4fd8-af48-e71bf757efd2', 'spxlFPL8WNSAmwL07b0e4su2Wa1EEZzw');