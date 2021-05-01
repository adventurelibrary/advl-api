INSERT INTO creators (id, slug, name, description) VALUES
('5caa7fd3-48aa-47fb-a7f1-f0e7b32b1721', 'default-creator', 'Default Creator', 'Just a default value');

INSERT INTO assets (id, creator_id, slug, name, description, tags, original_file_ext, type, size_in_bytes) VALUES
('436b14c1-07e1-402c-abfd-70140d3d4e27', '5caa7fd3-48aa-47fb-a7f1-f0e7b32b1721', 'cool-token', 'Cool Token', '', '{"Archer","Winter"}', 'jpg', 'TOKEN', 0);
