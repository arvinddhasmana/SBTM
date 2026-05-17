import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Sta } from './sta.entity';

@Entity('stx_boards')
@Unique(['staId', 'shortCode'])
export class Board {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sta_id', type: 'uuid' })
  staId: string;

  @ManyToOne(() => Sta)
  @JoinColumn({ name: 'sta_id' })
  sta?: Sta;

  @Column({ type: 'text' })
  name: string;

  @Column({ name: 'short_code', type: 'text' })
  shortCode: string;

  @Column({ type: 'text', nullable: true })
  region: string | null;

  @Column({ type: 'text', default: 'en' })
  language: string;

  @Column({ name: 'external_ids', type: 'jsonb', default: () => `'{}'::jsonb` })
  externalIds: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
