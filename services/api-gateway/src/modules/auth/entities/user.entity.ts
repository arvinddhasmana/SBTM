import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '@sbtm/common';

export type IdentityProvider = 'local' | 'oidc:ocsb' | 'oidc:ocdsb';
export type AnchorKind =
  | 'super'
  | 'sta'
  | 'board'
  | 'school'
  | 'operator'
  | 'driver'
  | 'parent';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'passwordHash', nullable: true })
  passwordHash?: string;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.PARENT,
  })
  role: Role;

  @Column({ name: 'firstName', nullable: true })
  firstName?: string;

  @Column({ name: 'lastName', nullable: true })
  lastName?: string;

  @Column({ name: 'isActive', default: true })
  isActive: boolean;

  @Column({ name: 'invitationToken', nullable: true, unique: true })
  invitationToken?: string;

  @Column({ name: 'invitationExpiresAt', nullable: true, type: 'timestamptz' })
  invitationExpiresAt?: Date;

  @Column({
    name: 'identity_provider',
    type: 'enum',
    enum: ['local', 'oidc:ocsb', 'oidc:ocdsb'],
    default: 'local',
  })
  identityProvider: IdentityProvider;

  @Column({ name: 'preferred_language', type: 'text', default: 'en' })
  preferredLanguage: string;

  @Column({ name: 'anchor_kind', type: 'text', nullable: true })
  anchorKind: AnchorKind | null;

  @Column({ name: 'anchor_id', type: 'uuid', nullable: true })
  anchorId: string | null;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
}
