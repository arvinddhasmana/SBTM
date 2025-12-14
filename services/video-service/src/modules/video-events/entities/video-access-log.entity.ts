import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    Index,
} from 'typeorm';

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

    @Column({ type: 'timestamp' })
    @Index()
    timestamp: Date;

    @Column({ name: 'ip_address' })
    ipAddress: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
