import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Operator } from './operator.entity';
import { Sta } from '../../organization/entities/sta.entity';
import { Board } from '../../organization/entities/board.entity';

@Entity('stx_operator_contracts')
export class OperatorContract {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'operator_id', type: 'uuid' })
  operatorId: string;

  @ManyToOne(() => Operator)
  @JoinColumn({ name: 'operator_id' })
  operator?: Operator;

  @Column({ name: 'sta_id', type: 'uuid' })
  staId: string;

  @ManyToOne(() => Sta)
  @JoinColumn({ name: 'sta_id' })
  sta?: Sta;

  @Column({ name: 'board_id', type: 'uuid', nullable: true })
  boardId: string | null;

  @ManyToOne(() => Board, { nullable: true })
  @JoinColumn({ name: 'board_id' })
  board?: Board | null;

  @Column({ name: 'effective_from', type: 'date' })
  effectiveFrom: string;

  @Column({ name: 'effective_to', type: 'date', nullable: true })
  effectiveTo: string | null;

  @Column({ name: 'route_count', type: 'int', nullable: true })
  routeCount: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
