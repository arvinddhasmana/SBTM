import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Sta } from '../../organization/entities/sta.entity';
import { Board } from '../../organization/entities/board.entity';
import { Operator } from '../../fleet/entities/operator.entity';

export enum AgencyKind {
  STA = 'sta',
  BOARD = 'board',
  OPERATOR = 'operator',
}

@Entity('agency')
export class Agency {
  @PrimaryColumn({ name: 'agency_id', type: 'text' })
  agencyId: string;

  @Column({ name: 'agency_name', type: 'text' })
  agencyName: string;

  @Column({ name: 'agency_url', type: 'text' })
  agencyUrl: string;

  @Column({ name: 'agency_timezone', type: 'text', default: 'America/Toronto' })
  agencyTimezone: string;

  @Column({ name: 'agency_lang', type: 'text', nullable: true })
  agencyLang: string | null;

  @Column({ name: 'agency_phone', type: 'text', nullable: true })
  agencyPhone: string | null;

  @Column({ name: 'agency_email', type: 'text', nullable: true })
  agencyEmail: string | null;

  @Column({
    name: 'stx_agency_kind',
    type: 'enum',
    enum: AgencyKind,
    enumName: 'stx_agency_kind_enum',
  })
  stxAgencyKind: AgencyKind;

  @Column({ name: 'stx_parent_agency_id', type: 'text', nullable: true })
  stxParentAgencyId: string | null;

  @ManyToOne(() => Agency, { nullable: true })
  @JoinColumn({ name: 'stx_parent_agency_id' })
  stxParentAgency?: Agency | null;

  @Column({ name: 'stx_sta_id', type: 'uuid', nullable: true })
  stxStaId: string | null;

  @ManyToOne(() => Sta, { nullable: true })
  @JoinColumn({ name: 'stx_sta_id' })
  stxSta?: Sta | null;

  @Column({ name: 'stx_board_id', type: 'uuid', nullable: true })
  stxBoardId: string | null;

  @ManyToOne(() => Board, { nullable: true })
  @JoinColumn({ name: 'stx_board_id' })
  stxBoard?: Board | null;

  @Column({ name: 'stx_operator_id', type: 'uuid', nullable: true })
  stxOperatorId: string | null;

  @ManyToOne(() => Operator, { nullable: true })
  @JoinColumn({ name: 'stx_operator_id' })
  stxOperator?: Operator | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
