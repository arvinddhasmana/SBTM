/**
 * PageVisibility entity
 *
 * Stores whether each hideable admin page is visible to non-Super-Admin users.
 * Settings and the page-visibility management page itself are excluded from management.
 *
 * Rows are upserted on change; pages without a row default to visible.
 * updatedBy records the Super Admin user ID for audit purposes — never a name or email.
 *
 * Classification: T2 — admin configuration, no student PII.
 */
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('page_visibility')
export class PageVisibility {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', unique: true })
  pageKey: string;

  @Column({ type: 'text' })
  pageName: string;

  @Column({ type: 'boolean', default: true })
  isVisible: boolean;

  @Column({ type: 'uuid', nullable: true })
  updatedBy?: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
