import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

export enum StudentStatus {
  ENROLLED = 'ENROLLED',
  INACTIVE = 'INACTIVE',
  GRADUATED = 'GRADUATED',
  WITHDRAWN = 'WITHDRAWN',
}

@Entity('stx_students')
@Unique(['school_id', 'external_student_id'])
export class Student {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @Column()
  grade: string;

  @Column({ nullable: true })
  address: string;

  @Index()
  @Column({ type: 'uuid' })
  school_id: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  parent_user_id: string;

  @Column({ type: 'uuid', nullable: true })
  am_route_id: string;

  @Column({ type: 'uuid', nullable: true })
  pm_route_id: string;

  @Column({ type: 'uuid', nullable: true })
  am_stop_id: string;

  @Column({ type: 'uuid', nullable: true })
  pm_stop_id: string;

  @Column({ nullable: true })
  external_student_id: string;

  @Column({
    type: 'enum',
    enum: StudentStatus,
    default: StudentStatus.ENROLLED,
  })
  status: StudentStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
