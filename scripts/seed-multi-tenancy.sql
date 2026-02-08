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
    ('s0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Demo Elementary School', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c'),
    ('s1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'Demo High School', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c')
ON CONFLICT (id) DO NOTHING;

-- 3. Create Multi-Tenant Users
-- Passwords are 'password123' hashed with bcrypt
INSERT INTO users (id, email, "passwordHash", role, "firstName", "lastName", "schoolId", "boardId", "createdAt", "updatedAt")
VALUES
    -- OSTA Admin
    (gen_random_uuid(), 'osta.admin@sbtm.demo', '$2b$10$681vlhdZCLSj7mruAWHXMeSN5phVF8s.mPNcZNprgDX3UYHa0XDwm', 'OSTA_ADMIN', 'OSTA', 'Admin', NULL, 'b1a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', NOW(), NOW()),
    
    -- Board Admin
    (gen_random_uuid(), 'board.admin@sbtm.demo', '$2b$10$681vlhdZCLSj7mruAWHXMeSN5phVF8s.mPNcZNprgDX3UYHa0XDwm', 'BOARD_ADMIN', 'Board', 'Admin', NULL, 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', NOW(), NOW()),
    
    -- School Admin
    (gen_random_uuid(), 'school.admin@sbtm.demo', '$2b$10$681vlhdZCLSj7mruAWHXMeSN5phVF8s.mPNcZNprgDX3UYHa0XDwm', 'SCHOOL_ADMIN', 'School', 'Admin', 's0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', 'b0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c', NOW(), NOW())
ON CONFLICT DO NOTHING;
