import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum InspectionType {
    PRE_TRIP = 'PRE_TRIP',
    POST_TRIP = 'POST_TRIP',
    MAINTENANCE = 'MAINTENANCE'
}

@Entity('vehicle_inspections')
export class VehicleInspection {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @Column({ type: 'uuid' })
    vehicle_id: string;

    @Index()
    @Column({ type: 'uuid' })
    driver_id: string;

    @Index()
    @Column({ type: 'uuid' })
    school_id: string;

    @Column({
        type: 'enum',
        enum: InspectionType,
        default: InspectionType.PRE_TRIP
    })
    type: InspectionType;

    @Column({ default: true })
    is_passed: boolean;

    @Column({ type: 'jsonb', nullable: true })
    checklist_json: any;

    @Column({ type: 'text', array: true, nullable: true })
    photo_urls: string[];

    @Column({ nullable: true })
    comments: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
