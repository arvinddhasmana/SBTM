import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @Column({ type: 'uuid' })
    user_id: string;

    @Index()
    @Column({ type: 'uuid' })
    school_id: string;

    @Column()
    action: string;

    @Index()
    @Column({ nullable: true })
    resource: string;

    @Index()
    @Column({ nullable: true })
    resource_id: string;

    @Column({ type: 'jsonb', nullable: true })
    details: any;

    @Column({ nullable: true })
    ip_address: string;

    @Column({ nullable: true })
    user_agent: string;

    @CreateDateColumn()
    @Index()
    createdAt: Date;
}
