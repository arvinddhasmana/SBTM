import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

export enum VideoEventType {
    EMERGENCY = 'EMERGENCY',
    INCIDENT = 'INCIDENT',
    MANUAL = 'MANUAL',
}

export enum VideoEventStatus {
    UPLOADING = 'UPLOADING',
    READY = 'READY',
    FAILED = 'FAILED',
}

const TIMESTAMP_COLUMN_TYPE =
    process.env.DB_TYPE === 'sqlite' ? 'datetime' : 'timestamp';

const ENUM_COLUMN_TYPE =
    process.env.DB_TYPE === 'sqlite' ? 'simple-enum' : 'enum';

@Entity('video_events')
@Index(['vehicleId', 'timestamp'])
@Index(['routeId', 'timestamp'])
@Index(['status'])
export class VideoEvent {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'school_id' })
    @Index()
    schoolId: string;

    @Column({ name: 'vehicle_id' })
    @Index()
    vehicleId: string;

    @Column({ name: 'route_id' })
    @Index()
    routeId: string;

    @Column({ name: 'driver_id' })
    @Index()
    driverId: string;

    @Column({ type: TIMESTAMP_COLUMN_TYPE as 'timestamp' | 'datetime' })
    @Index()
    timestamp: Date;

    @Column({
        type: ENUM_COLUMN_TYPE as 'enum' | 'simple-enum',
        enum: VideoEventType,
        name: 'event_type',
    })
    eventType: VideoEventType;

    @Column({ name: 'duration_seconds', type: 'int' })
    durationSeconds: number;

    @Column({ name: 'video_url', nullable: true })
    videoUrl: string;

    @Column({ name: 'thumbnail_url', nullable: true })
    thumbnailUrl: string;

    @Column({
        type: ENUM_COLUMN_TYPE as 'enum' | 'simple-enum',
        enum: VideoEventStatus,
        default: VideoEventStatus.UPLOADING,
    })
    status: VideoEventStatus;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
