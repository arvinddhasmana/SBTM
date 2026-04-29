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

  @Column({ type: 'varchar', length: 100, unique: true })
  configName: string;

  @Column({ type: 'varchar', length: 20 })
  tier: string;

  @Column({ type: 'integer', nullable: true })
  confirmationTimeoutMs: number | null;

  @Column({ type: 'integer', nullable: true })
  boardEscalationMs: number | null;

  @Column({ type: 'integer', nullable: true })
  ostaEscalationMs: number | null;

  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
