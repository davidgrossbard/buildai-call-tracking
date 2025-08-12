-- Delete all data from tables
-- Order matters due to foreign key constraints

-- First delete all signups (references calls)
DELETE FROM signups;

-- Then delete all calls (references contacts)
DELETE FROM calls;

-- Then delete all contacts (references companies)
DELETE FROM contacts;

-- Finally delete all companies
DELETE FROM companies;

-- Reset sequences if you want IDs to start from 1 again (optional)
ALTER SEQUENCE companies_id_seq RESTART WITH 1;
ALTER SEQUENCE contacts_id_seq RESTART WITH 1;
ALTER SEQUENCE calls_id_seq RESTART WITH 1;
ALTER SEQUENCE signups_id_seq RESTART WITH 1;