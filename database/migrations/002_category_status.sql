-- 002: categories can be deactivated (products can't be created under an inactive category)
ALTER TABLE categories
  ADD COLUMN status record_status NOT NULL DEFAULT 'ACTIVE';

CREATE INDEX categories_status_idx ON categories (status);
