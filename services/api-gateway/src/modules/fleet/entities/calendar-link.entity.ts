import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Check,
} from 'typeorm';
import { Board } from '../../organization/entities/board.entity';
import { School } from '../../organization/entities/school.entity';

@Entity('stx_calendar_link')
@Check(`"board_id" IS NOT NULL OR "school_id" IS NOT NULL`)
export class CalendarLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'service_id', type: 'text' })
  serviceId: string;

  @Column({ name: 'board_id', type: 'uuid', nullable: true })
  boardId: string | null;

  @ManyToOne(() => Board, { nullable: true })
  @JoinColumn({ name: 'board_id' })
  board?: Board | null;

  @Column({ name: 'school_id', type: 'uuid', nullable: true })
  schoolId: string | null;

  @ManyToOne(() => School, { nullable: true })
  @JoinColumn({ name: 'school_id' })
  school?: School | null;
}
