import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, Unique } from 'typeorm';

export enum ComplianceStatus {
    VALID = 'VALID',
    EXPIRING_SOON = 'EXPIRING_SOON',
    EXPIRED = 'EXPIRED',
    PENDING = 'PENDING'
}

@Entity('driver_compliance')
@Unique(['driver_id'])
export class DriverCompliance {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @Column({ type: 'uuid' })
    driver_id: string;

    @Index()
    @Column({ type: 'uuid' })
    school_id: string;

    @Column({ type: 'date', nullable: true })
    license_expiry: Date;

    @Column({ type: 'date', nullable: true })
    background_check_last_date: Date;

    @Column({ type: 'date', nullable: true })
    medical_check_due_date: Date;

    @Column({
        type: 'enum',
        enum: ComplianceStatus,
        default: ComplianceStatus.PENDING
    })
    status: ComplianceStatus;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
