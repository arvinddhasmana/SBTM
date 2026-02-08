import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { SchoolBoard } from './school-board.entity';
import { User } from './user.entity';

@Entity('schools')
export class School {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column()
    boardId: string;

    @ManyToOne(() => SchoolBoard, (board) => board.schools)
    @JoinColumn({ name: 'boardId' })
    board: SchoolBoard;

    @OneToMany(() => User, (user) => user.school)
    users: User[];
}
