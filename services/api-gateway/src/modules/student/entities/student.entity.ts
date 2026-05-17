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
import {
  geographyPointTransformer,
  type LatLng,
} from '../../../common/transformers/geography-point.transformer';

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

  // PostGIS `geography(Point, 4326)` — see geographyPointTransformer for
  // serialisation; raw-SQL callers should use ST_X/ST_Y and ST_MakePoint.
  @Column({
    name: 'home_location',
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
    transformer: geographyPointTransformer,
  })
  homeLocation: LatLng | null;

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
