import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    Index,
} from 'typeorm';

const TIMESTAMP_COLUMN_TYPE =
    process.env.DB_TYPE === 'sqlite' ? 'datetime' : 'timestamp';

@Entity('video_access_logs')
@Index(['videoEventId', 'timestamp'])
@Index(['userId', 'timestamp'])
export class VideoAccessLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'video_event_id' })
    @Index()
    videoEventId: string;

    @Column({ name: 'user_id' })
    @Index()
    userId: string;

    @Column({ type: TIMESTAMP_COLUMN_TYPE as 'timestamp' | 'datetime' })
    @Index()
    timestamp: Date;

    @Column({ name: 'ip_address' })
    ipAddress: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
