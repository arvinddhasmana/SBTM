import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('alert_config_audit')
export class AlertConfigAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'config_table', type: 'varchar', length: 100 })
  configTable: string;

  @Column({ name: 'config_id', type: 'uuid' })
  configId: string;

  @Column({ name: 'action', type: 'varchar', length: 50 })
  action: string;

  @Column({ name: 'changed_by_user_id', type: 'uuid' })
  changedByUserId: string;

  @Column({ name: 'changed_by_role', type: 'varchar', length: 50 })
  changedByRole: string;

  @Column({ name: 'old_values', type: 'jsonb', nullable: true })
  oldValues: Record<string, any> | null;

  @Column({ name: 'new_values', type: 'jsonb', nullable: true })
  newValues: Record<string, any> | null;

  @Column({ name: 'change_reason', type: 'text', nullable: true })
  changeReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
