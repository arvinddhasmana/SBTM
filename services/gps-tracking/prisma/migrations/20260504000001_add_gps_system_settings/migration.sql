-- Migration: add_gps_system_settings
-- Adds system_settings (platform-wide key/value config) and
-- gps_device_tokens (hardware GPS device authentication) tables.
-- The GPS_TRACKING_SOURCE setting defaults to DRIVER_APP so existing
-- deployments continue to operate without any administrative action.

-- CreateTable: system_settings
CREATE TABLE "system_settings" (
    "id"         TEXT        NOT NULL,
    "key"        TEXT        NOT NULL,
    "value"      TEXT        NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_by" TEXT,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique key per setting
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- Seed: default GPS source — preserves existing driver-app behaviour
INSERT INTO "system_settings" ("id", "key", "value", "updated_at")
VALUES (gen_random_uuid(), 'GPS_TRACKING_SOURCE', 'DRIVER_APP', NOW())
ON CONFLICT ("key") DO NOTHING;

-- CreateTable: gps_device_tokens
CREATE TABLE "gps_device_tokens" (
    "id"          TEXT        NOT NULL,
    "token"       TEXT        NOT NULL,
    "vehicle_id"  TEXT        NOT NULL,
    "school_id"   TEXT        NOT NULL,
    "description" TEXT,
    "is_active"   BOOLEAN     NOT NULL DEFAULT TRUE,
    "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "last_seen_at" TIMESTAMPTZ,

    CONSTRAINT "gps_device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique token lookup (primary auth index)
CREATE UNIQUE INDEX "gps_device_tokens_token_key" ON "gps_device_tokens"("token");

-- CreateIndex: list tokens by tenant
CREATE INDEX "gps_device_tokens_school_id_idx" ON "gps_device_tokens"("school_id");
