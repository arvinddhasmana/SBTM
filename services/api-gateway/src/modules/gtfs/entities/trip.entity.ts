import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Route } from './route.entity';
import { Calendar } from './calendar.entity';
import { Run } from '../../fleet/entities/run.entity';

@Entity('trips')
export class Trip {
  @PrimaryColumn({ name: 'trip_id', type: 'text' })
  tripId: string;

  @Column({ name: 'route_id', type: 'text' })
  routeId: string;

  @ManyToOne(() => Route)
  @JoinColumn({ name: 'route_id' })
  route?: Route;

  @Column({ name: 'service_id', type: 'text' })
  serviceId: string;

  @ManyToOne(() => Calendar)
  @JoinColumn({ name: 'service_id' })
  calendar?: Calendar;

  @Column({ name: 'shape_id', type: 'text', nullable: true })
  shapeId: string | null;

  @Column({ name: 'trip_headsign', type: 'text', nullable: true })
  tripHeadsign: string | null;

  @Column({ name: 'direction_id', type: 'int', default: 0 })
  directionId: number;

  @Column({ name: 'block_id', type: 'text', nullable: true })
  blockId: string | null;

  @Column({ name: 'stx_run_id', type: 'uuid', nullable: true })
  stxRunId: string | null;

  @ManyToOne(() => Run, { nullable: true })
  @JoinColumn({ name: 'stx_run_id' })
  stxRun?: Run | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
