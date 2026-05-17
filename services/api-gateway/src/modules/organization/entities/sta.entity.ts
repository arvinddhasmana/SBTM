import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('stx_sta')
export class Sta {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ name: 'short_code', type: 'text', unique: true })
  shortCode: string;

  @Column({ type: 'text', nullable: true })
  region: string | null;

  @Column({ name: 'time_zone', type: 'text', default: 'America/Toronto' })
  timeZone: string;

  @Column({ type: 'text', array: true, default: () => `ARRAY['en']` })
  languages: string[];

  @Column({ name: 'boarding_event_retention_days', type: 'int', default: 395 })
  boardingEventRetentionDays: number;

  @Column({ name: 'alert_retention_days', type: 'int', default: 730 })
  alertRetentionDays: number;

  @Column({ name: 'import_cadence', type: 'text', default: 'quarterly' })
  importCadence: string;

  @Column({ name: 'external_ids', type: 'jsonb', default: () => `'{}'::jsonb` })
  externalIds: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
