import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { School } from '../../organization/entities/school.entity';

export enum StudentStatus {
  ENROLLED = 'enrolled',
  INACTIVE = 'inactive',
  GRADUATED = 'graduated',
  WITHDRAWN = 'withdrawn',
}

@Entity('stx_students')
export class Student {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'school_id', type: 'uuid' })
  schoolId: string;

  @ManyToOne(() => School)
  @JoinColumn({ name: 'school_id' })
  school?: School;

  @Column({ name: 'board_student_number', type: 'bytea', nullable: true })
  boardStudentNumber: Buffer | null;

  @Column({ name: 'legal_name', type: 'bytea' })
  legalName: Buffer;

  @Column({ name: 'preferred_name', type: 'bytea', nullable: true })
  preferredName: Buffer | null;

  @Column({ type: 'text', nullable: true })
  grade: string | null;

  @Column({ name: 'date_of_birth', type: 'bytea', nullable: true })
  dateOfBirth: Buffer | null;

  @Column({ name: 'home_address', type: 'bytea', nullable: true })
  homeAddress: Buffer | null;

  // TODO(phase-B): wire PostGIS column type — geography(Point, 4326)
  @Column({ name: 'home_location', type: 'text', nullable: true })
  homeLocation: string | null;

  @Column({
    type: 'enum',
    enum: StudentStatus,
    enumName: 'stx_student_status_enum',
    default: StudentStatus.ENROLLED,
  })
  status: StudentStatus;

  @Column({
    name: 'medical_flags',
    type: 'jsonb',
    default: () => `'{}'::jsonb`,
  })
  medicalFlags: Record<string, unknown>;

  @Column({
    name: 'transport_flags',
    type: 'jsonb',
    default: () => `'{}'::jsonb`,
  })
  transportFlags: Record<string, unknown>;

  @Column({ name: 'external_ids', type: 'jsonb', default: () => `'{}'::jsonb` })
  externalIds: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
