import { Test, TestingModule } from '@nestjs/testing';
import { ProvisioningService } from './provisioning.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Role } from '../../common/decorators/roles.decorator';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('ProvisioningService', () => {
    let service: ProvisioningService;

    const mockOstaAdmin = { id: 'osta-1', role: Role.OSTA_ADMIN };
    const mockBoardAdmin = { id: 'board-admin-1', role: Role.BOARD_ADMIN, boardId: 'board-1' };
    const mockSchoolAdmin = { id: 'school-admin-1', role: Role.SCHOOL_ADMIN, schoolId: 'school-1', boardId: 'board-1' };

    const mockRepo = {
        findOne: jest.fn(),
        find: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        remove: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProvisioningService,
                {
                    provide: getRepositoryToken(User),
                    useValue: mockRepo,
                },
            ],
        }).compile();

        service = module.get<ProvisioningService>(ProvisioningService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('inviteUser', () => {
        it('creates invitation for PARENT role by OSTA_ADMIN', async () => {
            mockRepo.findOne.mockResolvedValue(null);
            mockRepo.create.mockReturnValue({ id: 'new-user-1', email: 'parent@test.example' });
            mockRepo.save.mockResolvedValue({ id: 'new-user-1', email: 'parent@test.example' });

            const result = await service.inviteUser(
                { email: 'parent@test.example', role: Role.PARENT, schoolId: 'school-1' },
                mockOstaAdmin,
            );

            expect(result.message).toBe('Invitation sent');
            expect(result.invitationUrl).toMatch(/activate\?token=/);
            expect(mockRepo.save).toHaveBeenCalledTimes(1);
            const savedUser = mockRepo.create.mock.calls[0][0];
            expect(savedUser.isActive).toBe(false);
        });

        it('throws BadRequest if user email already exists', async () => {
            mockRepo.findOne.mockResolvedValue({ id: 'existing', email: 'dup@test.example' });
            await expect(
                service.inviteUser({ email: 'dup@test.example', role: Role.PARENT }, mockOstaAdmin),
            ).rejects.toThrow(BadRequestException);
        });

        it('prevents BOARD_ADMIN from inviting another BOARD_ADMIN', async () => {
            mockRepo.findOne.mockResolvedValue(null);
            await expect(
                service.inviteUser({ email: 'new@test.example', role: Role.BOARD_ADMIN }, mockBoardAdmin),
            ).rejects.toThrow(ForbiddenException);
        });

        it('prevents SCHOOL_ADMIN from inviting BOARD_ADMIN', async () => {
            mockRepo.findOne.mockResolvedValue(null);
            await expect(
                service.inviteUser({ email: 'new@test.example', role: Role.BOARD_ADMIN }, mockSchoolAdmin),
            ).rejects.toThrow(ForbiddenException);
        });

        // Tenant isolation: BOARD_ADMIN cannot override boardId
        it('forces BOARD_ADMIN to use their own boardId', async () => {
            mockRepo.findOne.mockResolvedValue(null);
            mockRepo.create.mockReturnValue({});
            mockRepo.save.mockResolvedValue({});

            await service.inviteUser(
                { email: 'new@test.example', role: Role.SCHOOL_ADMIN, schoolId: 'school-2', boardId: 'other-board' },
                mockBoardAdmin,
            );

            const createArg = mockRepo.create.mock.calls[0][0];
            expect(createArg.boardId).toBe('board-1'); // overridden to inviter's boardId
        });
    });

    describe('activateAccount', () => {
        it('activates a pending user account and hashes the password', async () => {
            const future = new Date(Date.now() + 1000 * 60 * 60 * 24);
            const pendingUser = {
                id: 'u-1',
                email: 'new@test.example',
                isActive: false,
                invitationToken: 'test-uuid-token-1234-5678-9012-3456',
                invitationExpiresAt: future,
                schoolId: 'school-1',
            };
            mockRepo.findOne.mockResolvedValue(pendingUser);
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
            mockRepo.save.mockResolvedValue({ ...pendingUser, isActive: true });

            const result = await service.activateAccount({
                token: 'test-uuid-token-1234-5678-9012-3456',
                password: 'Secure@Pass1',
                firstName: 'Jane',
                lastName: 'Doe',
            });

            expect(result.message).toBe('Account activated successfully');
            expect(pendingUser.isActive).toBe(true);
            expect(pendingUser.invitationToken).toBeUndefined();
        });

        it('rejects an expired invitation token', async () => {
            const expired = {
                id: 'u-2',
                isActive: false,
                invitationToken: 'expired-token',
                invitationExpiresAt: new Date(Date.now() - 1000),
            };
            mockRepo.findOne.mockResolvedValue(expired);
            await expect(
                service.activateAccount({ token: 'expired-token', password: 'Secure@Pass1' }),
            ).rejects.toThrow(BadRequestException);
        });

        it('rejects if token not found', async () => {
            mockRepo.findOne.mockResolvedValue(null);
            await expect(
                service.activateAccount({ token: 'unknown-token', password: 'Secure@Pass1' }),
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('listUsers - tenant isolation', () => {
        it('OSTA_ADMIN gets all users', async () => {
            mockRepo.find.mockResolvedValue([{ id: 'u-1' }, { id: 'u-2' }]);
            const result = await service.listUsers(mockOstaAdmin);
            expect(mockRepo.find).toHaveBeenCalledWith();
            expect(result).toHaveLength(2);
        });

        it('BOARD_ADMIN gets only users in their board', async () => {
            mockRepo.find.mockResolvedValue([{ id: 'u-1', boardId: 'board-1' }]);
            await service.listUsers(mockBoardAdmin);
            expect(mockRepo.find).toHaveBeenCalledWith({ where: { boardId: 'board-1' } });
        });

        it('SCHOOL_ADMIN gets only users in their school', async () => {
            mockRepo.find.mockResolvedValue([{ id: 'u-1', schoolId: 'school-1' }]);
            await service.listUsers(mockSchoolAdmin);
            expect(mockRepo.find).toHaveBeenCalledWith({ where: { schoolId: 'school-1' } });
        });

        it('throws ForbiddenException for DRIVER role', async () => {
            const driver = { id: 'd-1', role: Role.DRIVER, schoolId: 'school-1' };
            await expect(service.listUsers(driver)).rejects.toThrow(ForbiddenException);
        });
    });

    describe('deactivateUser', () => {
        it('OSTA_ADMIN can deactivate any user', async () => {
            const target = { id: 'target-1', isActive: true, boardId: 'board-2', schoolId: 'school-2' };
            mockRepo.findOne.mockResolvedValue(target);
            mockRepo.save.mockResolvedValue({ ...target, isActive: false });

            const result = await service.deactivateUser('target-1', mockOstaAdmin);
            expect(result.message).toBe('User deactivated');
        });

        it('BOARD_ADMIN cannot deactivate user from a different board', async () => {
            const target = { id: 'target-2', isActive: true, boardId: 'other-board', schoolId: 'school-x' };
            mockRepo.findOne.mockResolvedValue(target);
            await expect(service.deactivateUser('target-2', mockBoardAdmin)).rejects.toThrow(ForbiddenException);
        });

        it('throws NotFoundException for unknown user', async () => {
            mockRepo.findOne.mockResolvedValue(null);
            await expect(service.deactivateUser('unknown', mockOstaAdmin)).rejects.toThrow(NotFoundException);
        });
    });

    describe('reactivateUser', () => {
        it('reactivates an inactive user', async () => {
            const target = { id: 'target-3', isActive: false, boardId: 'board-1', schoolId: 'school-1' };
            mockRepo.findOne.mockResolvedValue(target);
            mockRepo.save.mockResolvedValue({ ...target, isActive: true });

            const result = await service.reactivateUser('target-3', mockBoardAdmin);
            expect(result.message).toBe('User reactivated');
        });
    });
});
