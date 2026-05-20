import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

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

  @Index()
  @Column({ type: 'uuid' })
  school_id: string;

  @Column({ nullable: true })
  grade: string;

  @Column({ type: 'bytea', nullable: true })
  legal_name: Buffer | null;

  @Column({ type: 'bytea', nullable: true })
  preferred_name: Buffer | null;

  @Column({ type: 'bytea', nullable: true })
  date_of_birth: Buffer | null;

  @Column({ type: 'bytea', nullable: true })
  home_address: Buffer | null;

  @Column({ type: 'bytea', nullable: true })
  board_student_number: Buffer | null;

  @Column({ type: 'jsonb', default: '{}' })
  external_ids: Record<string, unknown>;

  @Column({ type: 'jsonb', default: '{}' })
  medical_flags: Record<string, unknown>;

  @Column({ type: 'jsonb', default: '{}' })
  transport_flags: Record<string, unknown>;

  @Column({
    type: 'enum',
    enum: StudentStatus,
    default: StudentStatus.ENROLLED,
  })
  status: StudentStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
