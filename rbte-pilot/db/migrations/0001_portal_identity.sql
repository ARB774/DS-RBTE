ALTER TABLE users ADD COLUMN portal_id varchar(32);
CREATE UNIQUE INDEX users_portal_id_unique ON users(portal_id);
DELETE FROM sessions;
