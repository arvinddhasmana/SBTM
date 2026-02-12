-- Seed Multi-Tenancy Data

-- 1. Create School Boards
INSERT INTO school_boards (id, name)
VALUES 
    ('b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Demo School Board'),
    ('b1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'OSTA Board')
ON CONFLICT (id) DO NOTHING;

-- 2. Create Schools
INSERT INTO schools (id, name, "boardId")
VALUES 
    ('c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Demo Elementary School', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('c1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Demo High School', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c')
ON CONFLICT (id) DO NOTHING;

-- 3. Users are seeded by seed-demo-data.sql
