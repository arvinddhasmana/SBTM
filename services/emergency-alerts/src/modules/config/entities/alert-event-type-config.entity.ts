import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('alert_event_type_config')
export class AlertEventTypeConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'event_type', type: 'varchar', length: 50, unique: true })
  eventType: string;

  @Column({ name: 'tier', type: 'varchar', length: 20 })
  tier: string;

  @Column({ name: 'display_name', type: 'varchar', length: 100 })
  displayName: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'requires_confirmation', type: 'boolean', default: false })
  requiresConfirmation: boolean;

  @Column({ name: 'notify_parents', type: 'boolean', default: false })
  notifyParents: boolean;

  @Column({ name: 'is_system_default', type: 'boolean', default: false })
  isSystemDefault: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
