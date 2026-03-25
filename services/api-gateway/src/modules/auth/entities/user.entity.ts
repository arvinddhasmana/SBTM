import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Role } from '../../../common/decorators/roles.decorator';
import { School } from './school.entity';
import { SchoolBoard } from './school-board.entity';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    email: string;

    @Column({ nullable: true })
    passwordHash?: string;

    @Column({
        type: 'enum',
        enum: Role,
        default: Role.PARENT,
    })
    role: Role;

    @Column({ nullable: true })
    firstName?: string;

    @Column({ nullable: true })
    lastName?: string;

    @Column({ nullable: true })
    driverId?: string;

    @Column('simple-array', { nullable: true })
    childRouteIds?: string[];

    @Column('simple-array', { nullable: true })
    assignedRouteIds?: string[];

    @Column({ nullable: true })
    schoolId?: string;

    @ManyToOne(() => School, (school) => school.users)
    @JoinColumn({ name: 'schoolId' })
    school?: School;

    @Column({ nullable: true })
    boardId?: string;

    @ManyToOne(() => SchoolBoard, (board) => board.users)
    @JoinColumn({ name: 'boardId' })
    board?: SchoolBoard;

    @Column({ default: true })
    isActive: boolean;

    @Column({ nullable: true, unique: true })
    invitationToken?: string;

    @Column({ nullable: true, type: 'timestamptz' })
    invitationExpiresAt?: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
