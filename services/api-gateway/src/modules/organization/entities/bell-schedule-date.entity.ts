import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { BellSchedule } from './bell-schedule.entity';
import { School } from './school.entity';

@Entity('stx_bell_schedule_dates')
@Unique(['bellScheduleId', 'schoolId', 'serviceDate'])
export class BellScheduleDate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'bell_schedule_id', type: 'uuid' })
  bellScheduleId: string;

  @ManyToOne(() => BellSchedule)
  @JoinColumn({ name: 'bell_schedule_id' })
  bellSchedule?: BellSchedule;

  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId: string | null;

  @ManyToOne(() => School, { nullable: true })
  @JoinColumn({ name: 'school_id' })
  school?: School | null;

  @Column({ name: 'service_date', type: 'date' })
  serviceDate: string;

  @Column({ name: 'am_bell', type: 'time', nullable: true })
  amBell: string | null;

  @Column({ name: 'midday_bell', type: 'time', nullable: true })
  middayBell: string | null;

  @Column({ name: 'pm_bell', type: 'time', nullable: true })
  pmBell: string | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
