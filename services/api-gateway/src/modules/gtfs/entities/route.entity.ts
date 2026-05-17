import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Agency } from './agency.entity';
import { Sta } from '../../organization/entities/sta.entity';
import { School } from '../../organization/entities/school.entity';

export enum DirectionKind {
  AM = 'am',
  PM = 'pm',
  MIDDAY = 'midday',
  KINDERGARTEN = 'kindergarten',
  ACTIVITY = 'activity',
}

export enum ShapeSource {
  STA_IMPORT = 'sta_import',
  SBTM_GENERATED = 'sbtm_generated',
  STA_ADMIN_EDITED = 'sta_admin_edited',
}

@Entity('routes')
export class Route {
  @PrimaryColumn({ name: 'route_id', type: 'text' })
  routeId: string;

  @Column({ name: 'agency_id', type: 'text', nullable: true })
  agencyId: string | null;

  @ManyToOne(() => Agency, { nullable: true })
  @JoinColumn({ name: 'agency_id' })
  agency?: Agency | null;

  @Column({ name: 'route_short_name', type: 'text', nullable: true })
  routeShortName: string | null;

  @Column({ name: 'route_long_name', type: 'text', nullable: true })
  routeLongName: string | null;

  @Column({ name: 'route_type', type: 'int', default: 712 })
  routeType: number;

  @Column({ name: 'route_color', type: 'text', nullable: true })
  routeColor: string | null;

  @Column({ name: 'route_text_color', type: 'text', nullable: true })
  routeTextColor: string | null;

  @Column({ name: 'stx_sta_id', type: 'uuid' })
  stxStaId: string;

  @ManyToOne(() => Sta)
  @JoinColumn({ name: 'stx_sta_id' })
  stxSta?: Sta;

  @Column({ name: 'stx_school_id', type: 'uuid' })
  stxSchoolId: string;

  @ManyToOne(() => School)
  @JoinColumn({ name: 'stx_school_id' })
  stxSchool?: School;

  @Column({
    name: 'stx_direction_kind',
    type: 'enum',
    enum: DirectionKind,
    enumName: 'stx_direction_kind_enum',
  })
  stxDirectionKind: DirectionKind;

  @Column({
    name: 'stx_shape_source',
    type: 'enum',
    enum: ShapeSource,
    enumName: 'stx_shape_source_enum',
    default: ShapeSource.STA_IMPORT,
  })
  stxShapeSource: ShapeSource;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
