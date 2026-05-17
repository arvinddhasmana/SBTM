import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('attributions')
export class Attribution {
  @PrimaryColumn({ name: 'attribution_id', type: 'text' })
  attributionId: string;

  @Column({ name: 'organization_name', type: 'text' })
  organizationName: string;

  @Column({ name: 'is_producer', type: 'boolean', default: false })
  isProducer: boolean;

  @Column({ name: 'is_operator', type: 'boolean', default: false })
  isOperator: boolean;

  @Column({ name: 'is_authority', type: 'boolean', default: false })
  isAuthority: boolean;

  @Column({ name: 'attribution_url', type: 'text', nullable: true })
  attributionUrl: string | null;

  @Column({ name: 'attribution_email', type: 'text', nullable: true })
  attributionEmail: string | null;

  @Column({ name: 'attribution_phone', type: 'text', nullable: true })
  attributionPhone: string | null;
}
