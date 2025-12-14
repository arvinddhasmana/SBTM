
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum TagType {
    SMARTTAG = 'SMARTTAG',
    RFID = 'RFID',
    NFC = 'NFC',
}

@Entity()
@Index(['tagId'], { unique: true })
export class StudentTag {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    studentId: string;

    @Column({ unique: true })
    tagId: string;

    @Column({
        type: 'enum',
        enum: TagType,
        default: TagType.SMARTTAG,
    })
    tagType: TagType;

    @CreateDateColumn()
    createdAt: Date;
}
