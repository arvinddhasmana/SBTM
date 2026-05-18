import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

export type DeviceTokenRecipientKind = 'user' | 'guardian';

/**
 * v2-followups #6: polymorphic recipient. Admin/driver push tokens key off
 * `users.id`; parent push tokens key off `stx_guardians.id`. The split keeps
 * `users` strictly for authenticatable identities. Cascade-on-delete is
 * enforced by triggers on `users` and `stx_guardians` (migration
 * 20260517_device_tokens_polymorphic.sql) since Postgres has no native
 * polymorphic FK.
 */
@Entity('device_tokens')
@Unique('uq_device_token_recipient_token', [
  'recipientKind',
  'recipientId',
  'token',
])
@Index('idx_device_tokens_recipient_active', [
  'recipientKind',
  'recipientId',
  'isActive',
])
export class DeviceToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'recipient_kind', type: 'text' })
  recipientKind: DeviceTokenRecipientKind;

  @Column({ name: 'recipient_id', type: 'uuid' })
  recipientId: string;

  @Column({ type: 'varchar', length: 512 })
  token: string;

  @Column({ type: 'varchar', length: 10 })
  platform: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
