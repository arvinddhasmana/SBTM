import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { School } from '../../organization/entities/school.entity';

export enum StopKind {
  PICKUP = 'pickup',
  SCHOOL = 'school',
  TRANSFER = 'transfer',
  DAYCARE = 'daycare',
  HAZARD_RELOCATION = 'hazard_relocation',
}

@Entity('stops')
export class Stop {
  @PrimaryColumn({ name: 'stop_id', type: 'text' })
  stopId: string;

  @Column({ name: 'stop_name', type: 'text' })
  stopName: string;

  @Column({ name: 'stop_lat', type: 'double precision' })
  stopLat: number;

  @Column({ name: 'stop_lon', type: 'double precision' })
  stopLon: number;

  @Column({ name: 'location_type', type: 'int', default: 0 })
  locationType: number;

  @Column({ name: 'parent_station', type: 'text', nullable: true })
  parentStation: string | null;

  @ManyToOne(() => Stop, { nullable: true })
  @JoinColumn({ name: 'parent_station' })
  parent?: Stop | null;

  @Column({
    name: 'stx_stop_kind',
    type: 'enum',
    enum: StopKind,
    enumName: 'stx_stop_kind_enum',
    default: StopKind.PICKUP,
  })
  stxStopKind: StopKind;

  @Column({ name: 'stx_hazard_zone', type: 'boolean', default: false })
  stxHazardZone: boolean;

  @Column({ name: 'stx_school_id', type: 'uuid', nullable: true })
  stxSchoolId: string | null;

  @ManyToOne(() => School, { nullable: true })
  @JoinColumn({ name: 'stx_school_id' })
  stxSchool?: School | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
