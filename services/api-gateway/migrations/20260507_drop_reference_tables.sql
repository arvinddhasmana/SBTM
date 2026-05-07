-- Migration: Drop reference tables and add stop columns to students
-- Date: 2026-05-07
-- Description: Eliminate dual-ID system by dropping reference tables
--              and making routes/students operational tables the single source of truth

-- Add stop columns to students table if missing
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS am_stop_id UUID REFERENCES route_stops(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pm_stop_id UUID REFERENCES route_stops(id) ON DELETE SET NULL;

-- Drop reference tables (CASCADE to handle any FKs)
DROP TABLE IF EXISTS route_stops_reference CASCADE;
DROP TABLE IF EXISTS routes_reference CASCADE;
DROP TABLE IF EXISTS students_reference CASCADE;
DROP TABLE IF EXISTS vehicles_reference CASCADE;
