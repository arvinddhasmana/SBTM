import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Operator } from './operator.entity';
import { User } from '../../auth/entities/user.entity';

@Entity('stx_drivers')
export class Driver {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'operator_id', type: 'uuid' })
  operatorId: string;

  @ManyToOne(() => Operator)
  @JoinColumn({ name: 'operator_id' })
  operator?: Operator;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User | null;

  @Column({ name: 'license_number', type: 'bytea', nullable: true })
  licenseNumber: Buffer | null;

  @Column({ name: 'license_class', type: 'text', nullable: true })
  licenseClass: string | null;

  @Column({ name: 'license_expiry', type: 'date', nullable: true })
  licenseExpiry: string | null;

  @Column({ name: 'medical_expiry', type: 'date', nullable: true })
  medicalExpiry: string | null;

  @Column({ name: 'background_check_date', type: 'date', nullable: true })
  backgroundCheckDate: string | null;

  @Column({ name: 'external_ids', type: 'jsonb', default: () => `'{}'::jsonb` })
  externalIds: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
