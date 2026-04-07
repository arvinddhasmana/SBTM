import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('fleet_assignments')
export class FleetAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  schoolId: string;

  @Column({ type: 'text' })
  routeId: string;

  @Column({ type: 'text' })
  vehicleId: string;

  @Column({ type: 'text', nullable: true })
  driverId?: string;

  @Column({ type: 'text', default: 'PROPOSED' })
  status: string;

  @Column({ type: 'uuid' })
  proposedByUserId: string;

  @Column({ type: 'uuid', nullable: true })
  reviewedByUserId?: string;

  @Column({ type: 'text', nullable: true })
  reviewNotes?: string;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt?: Date;

  @Column({ type: 'date', nullable: true })
  effectiveDate?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
