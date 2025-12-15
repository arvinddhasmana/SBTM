import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    username: string;

    @Column()
    passwordOrHash: string; // simplifying for MVP/demo, ideally hashed

    @Column('simple-array')
    roles: string[];
}
