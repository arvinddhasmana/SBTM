import {
  Entity,
  Column,
  PrimaryColumn,
  Check,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Calendar } from './calendar.entity';

@Entity('calendar_dates')
@Check(`"exception_type" IN (1, 2)`)
export class CalendarDate {
  @PrimaryColumn({ name: 'service_id', type: 'text' })
  serviceId: string;

  @ManyToOne(() => Calendar)
  @JoinColumn({ name: 'service_id' })
  calendar?: Calendar;

  @PrimaryColumn({ name: 'exception_date', type: 'date' })
  exceptionDate: string;

  @Column({ name: 'exception_type', type: 'int' })
  exceptionType: number;
}
