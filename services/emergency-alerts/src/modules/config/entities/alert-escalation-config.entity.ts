import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('alert_escalation_config')
export class AlertEscalationConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'config_name', type: 'varchar', length: 100, unique: true })
  configName: string;

  @Column({ name: 'tier', type: 'varchar', length: 20 })
  tier: string;

  @Column({ name: 'confirmation_timeout_ms', type: 'integer', nullable: true })
  confirmationTimeoutMs: number | null;

  @Column({ name: 'board_escalation_ms', type: 'integer', nullable: true })
  boardEscalationMs: number | null;

  @Column({ name: 'osta_escalation_ms', type: 'integer', nullable: true })
  ostaEscalationMs: number | null;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
