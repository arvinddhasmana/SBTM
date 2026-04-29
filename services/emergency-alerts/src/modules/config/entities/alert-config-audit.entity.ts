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

  @Column({ type: 'varchar', length: 100 })
  configTable: string;

  @Column({ type: 'uuid' })
  configId: string;

  @Column({ type: 'varchar', length: 50 })
  action: string;

  @Column({ type: 'uuid' })
  changedByUserId: string;

  @Column({ type: 'varchar', length: 50 })
  changedByRole: string;

  @Column({ type: 'jsonb', nullable: true })
  oldValues: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  newValues: Record<string, any> | null;

  @Column({ type: 'text', nullable: true })
  changeReason: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
