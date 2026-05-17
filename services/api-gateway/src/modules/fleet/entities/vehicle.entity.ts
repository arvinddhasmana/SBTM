import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Operator } from './operator.entity';

export enum VehicleStatus {
  ACTIVE = 'active',
  MAINTENANCE = 'maintenance',
  INACTIVE = 'inactive',
}

@Entity('stx_vehicles')
@Unique(['operatorId', 'licensePlate'])
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'operator_id', type: 'uuid' })
  operatorId: string;

  @ManyToOne(() => Operator)
  @JoinColumn({ name: 'operator_id' })
  operator?: Operator;

  @Column({ name: 'license_plate', type: 'text' })
  licensePlate: string;

  @Column({ name: 'capacity_seated', type: 'int', nullable: true })
  capacitySeated: number | null;

  @Column({ name: 'capacity_wheelchair', type: 'int', nullable: true })
  capacityWheelchair: number | null;

  @Column({ type: 'jsonb', default: () => `'{}'::jsonb` })
  equipment: Record<string, unknown>;

  @Column({
    type: 'enum',
    enum: VehicleStatus,
    enumName: 'stx_vehicle_status_enum',
    default: VehicleStatus.ACTIVE,
  })
  status: VehicleStatus;

  @Column({ name: 'external_ids', type: 'jsonb', default: () => `'{}'::jsonb` })
  externalIds: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
