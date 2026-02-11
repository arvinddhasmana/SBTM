
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum EventType {
    BOARD = 'BOARD',
    ALIGHT = 'ALIGHT',
}

export enum EventSource {
    SMARTTAG = 'SMARTTAG',
    MANUAL = 'MANUAL',
    RFID = 'RFID',
}

@Entity()
@Index(['studentId', 'routeId', 'timestamp'])
@Index(['vehicleId', 'timestamp'])
export class PresenceEvent {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    schoolId: string;

    @Column()
    studentId: string;

    @Column()
    vehicleId: string;

    @Column()
    routeId: string;

    @Column({
        type: 'enum',
        enum: EventType,
    })
    eventType: EventType;

    @Column()
    timestamp: Date;

    @Column({
        type: 'enum',
        enum: EventSource,
        default: EventSource.SMARTTAG,
    })
    source: EventSource;

    @Column('float', { nullable: true })
    signalStrength: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
