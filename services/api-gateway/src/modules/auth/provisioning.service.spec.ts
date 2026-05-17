import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '@sbtm/common';
import { ProvisioningService } from './provisioning.service';
import { User } from './entities/user.entity';

jest.mock('bcrypt');

/**
 * v2 ProvisioningService spec — exercises the anchor-model invite/activate/list/
 * deactivate/reactivate paths. The v1 spec used the (boardId, schoolId) JWT shape
 * which is gone in v2; this rewrite uses (anchorKind, anchorId) throughout and
 * additionally covers the v2-only `resolveAnchor` rules.
 */
describe('ProvisioningService (v2)', () => {
  let service: ProvisioningService;

  const mockRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const superAdmin = {
    id: 'super-1',
    role: Role.SUPER_ADMIN,
    anchorKind: 'super' as const,
    anchorId: null,
  };
  const staAdmin = {
    id: 'sta-1',
    role: Role.STA_ADMIN,
    anchorKind: 'sta' as const,
    anchorId: 'sta-osta',
  };
  const boardAdmin = {
    id: 'board-admin-1',
    role: Role.BOARD_ADMIN,
    anchorKind: 'board' as const,
    anchorId: 'board-ocsb',
  };
  const schoolAdmin = {
    id: 'school-admin-1',
    role: Role.SCHOOL_ADMIN,
    anchorKind: 'school' as const,
    anchorId: 'school-bernadette',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProvisioningService,
        { provide: getRepositoryToken(User), useValue: mockRepo },
      ],
    }).compile();

    service = module.get(ProvisioningService);
    jest.clearAllMocks();
    mockRepo.create.mockImplementation((u) => u);
    mockRepo.save.mockImplementation(async (u) => u);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('inviteUser', () => {
    it('STA_ADMIN may invite a PARENT with an explicit guardian anchorId', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      const result = await service.inviteUser(
        {
          email: 'parent@test.example',
          role: Role.PARENT,
          anchorKind: 'parent',
          anchorId: '11111111-1111-1111-1111-111111111111',
        },
        staAdmin,
      );

      expect(result.message).toBe('Invitation sent');
      expect(result.invitationUrl).toMatch(/^\/activate\?token=/);
      const saved = mockRepo.create.mock.calls[0][0];
      expect(saved.isActive).toBe(false);
      expect(saved.anchorKind).toBe('parent');
      expect(saved.anchorId).toBe('11111111-1111-1111-1111-111111111111');
      expect(saved.invitationToken).toBeDefined();
    });

    it('rejects when email already exists', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 'dup', email: 'd@x' });
      await expect(
        service.inviteUser(
          {
            email: 'd@x',
            role: Role.PARENT,
            anchorKind: 'parent',
            anchorId: '22222222-2222-2222-2222-222222222222',
          },
          staAdmin,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('only SUPER_ADMIN may invite STA_ADMIN — STA_ADMIN attempting to is denied', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(
        service.inviteUser(
          {
            email: 'new-sta@x',
            role: Role.STA_ADMIN,
            anchorKind: 'sta',
            anchorId: '33333333-3333-3333-3333-333333333333',
          },
          staAdmin,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('BOARD_ADMIN cannot invite another BOARD_ADMIN', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(
        service.inviteUser(
          {
            email: 'new-board@x',
            role: Role.BOARD_ADMIN,
            anchorKind: 'board',
            anchorId: 'board-other',
          },
          boardAdmin,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('SCHOOL_ADMIN may only invite drivers and parents', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(
        service.inviteUser(
          {
            email: 'new-board@x',
            role: Role.BOARD_ADMIN,
            anchorKind: 'board',
            anchorId: 'board-x',
          },
          schoolAdmin,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('BOARD_ADMIN inviting a SCHOOL_ADMIN: anchor is forced to a school under the inviter scope, not the requested override', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      // The v2 resolver inherits the inviter's anchor when kinds match. For BOARD_ADMIN
      // inviting SCHOOL_ADMIN the kinds differ ('board' vs 'school'), so the resolver
      // falls through to the higher-tier branch — but the inviter is not higher-tier,
      // so a missing anchorId on the DTO surfaces as BadRequest rather than a silent
      // scope escalation. This locks in the "no cross-anchor escalation" invariant.
      await expect(
        service.inviteUser(
          {
            email: 'new-school@x',
            role: Role.SCHOOL_ADMIN,
            // anchorId deliberately omitted — BOARD_ADMIN cannot mint a school anchor
          },
          boardAdmin,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('STA_ADMIN inviting BOARD_ADMIN requires explicit board anchorId', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(
        service.inviteUser({ email: 'b@x', role: Role.BOARD_ADMIN }, staAdmin),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('activateAccount', () => {
    it('activates a pending user and hashes the password', async () => {
      const future = new Date(Date.now() + 60 * 60 * 1000);
      const pending = {
        id: 'u-1',
        email: 'new@x',
        isActive: false,
        invitationToken: 'tok-1',
        invitationExpiresAt: future,
      } as Partial<User> as User;
      mockRepo.findOne.mockResolvedValue(pending);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed!');

      const result = await service.activateAccount({
        token: 'tok-1',
        password: 'Secure@Pass1',
        firstName: 'Jane',
        lastName: 'Doe',
      });

      expect(result.message).toBe('Account activated successfully');
      expect(pending.isActive).toBe(true);
      expect(pending.passwordHash).toBe('hashed!');
      expect(pending.invitationToken).toBeUndefined();
      expect(pending.firstName).toBe('Jane');
    });

    it('rejects an expired token', async () => {
      mockRepo.findOne.mockResolvedValue({
        id: 'u-2',
        isActive: false,
        invitationToken: 'expired',
        invitationExpiresAt: new Date(Date.now() - 1000),
      });
      await expect(
        service.activateAccount({ token: 'expired', password: 'Secure@Pass1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an unknown token', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(
        service.activateAccount({ token: 'nope', password: 'Secure@Pass1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects re-activating an already-active account', async () => {
      mockRepo.findOne.mockResolvedValue({
        id: 'u-3',
        isActive: true,
        invitationToken: 'tok-3',
        invitationExpiresAt: new Date(Date.now() + 60_000),
      });
      await expect(
        service.activateAccount({ token: 'tok-3', password: 'Secure@Pass1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('listUsers', () => {
    it('SUPER_ADMIN sees all users', async () => {
      mockRepo.find.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
      const result = await service.listUsers(superAdmin);
      expect(mockRepo.find).toHaveBeenCalledWith();
      expect(result).toHaveLength(2);
    });

    it('STA_ADMIN sees all users (precise scoping is a phase-B TODO)', async () => {
      mockRepo.find.mockResolvedValue([{ id: 'a' }]);
      await service.listUsers(staAdmin);
      expect(mockRepo.find).toHaveBeenCalledWith();
    });

    it('BOARD_ADMIN sees only users anchored to their board', async () => {
      mockRepo.find.mockResolvedValue([
        { id: 'a', anchorKind: 'board', anchorId: 'board-ocsb' },
      ]);
      await service.listUsers(boardAdmin);
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { anchorKind: 'board', anchorId: 'board-ocsb' },
      });
    });

    it('SCHOOL_ADMIN sees only users anchored to their school', async () => {
      mockRepo.find.mockResolvedValue([
        { id: 'a', anchorKind: 'school', anchorId: 'school-bernadette' },
      ]);
      await service.listUsers(schoolAdmin);
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { anchorKind: 'school', anchorId: 'school-bernadette' },
      });
    });

    it('DRIVER cannot list users', async () => {
      await expect(
        service.listUsers({
          id: 'd-1',
          role: Role.DRIVER,
          anchorKind: 'driver',
          anchorId: 'driver-1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deactivateUser', () => {
    it('STA_ADMIN may deactivate any user', async () => {
      const target = {
        id: 't-1',
        isActive: true,
        anchorKind: 'school',
        anchorId: 'school-other',
      } as Partial<User> as User;
      mockRepo.findOne.mockResolvedValue(target);

      const result = await service.deactivateUser('t-1', staAdmin);

      expect(result.message).toBe('User deactivated');
      expect(target.isActive).toBe(false);
    });

    it('BOARD_ADMIN cannot deactivate a user anchored outside their board', async () => {
      mockRepo.findOne.mockResolvedValue({
        id: 't-2',
        isActive: true,
        anchorKind: 'board',
        anchorId: 'board-other',
      });
      await expect(service.deactivateUser('t-2', boardAdmin)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('BOARD_ADMIN may deactivate a user anchored to their own board', async () => {
      const target = {
        id: 't-3',
        isActive: true,
        anchorKind: 'board',
        anchorId: 'board-ocsb',
      } as Partial<User> as User;
      mockRepo.findOne.mockResolvedValue(target);

      const result = await service.deactivateUser('t-3', boardAdmin);
      expect(result.message).toBe('User deactivated');
      expect(target.isActive).toBe(false);
    });

    it('NotFound when target user does not exist', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.deactivateUser('missing', staAdmin)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('reactivateUser', () => {
    it('reactivates an inactive user in scope', async () => {
      const target = {
        id: 't-4',
        isActive: false,
        anchorKind: 'school',
        anchorId: 'school-bernadette',
      } as Partial<User> as User;
      mockRepo.findOne.mockResolvedValue(target);

      const result = await service.reactivateUser('t-4', schoolAdmin);
      expect(result.message).toBe('User reactivated');
      expect(target.isActive).toBe(true);
    });

    it('refuses to reactivate a user outside the caller anchor scope', async () => {
      mockRepo.findOne.mockResolvedValue({
        id: 't-5',
        isActive: false,
        anchorKind: 'school',
        anchorId: 'school-other',
      });
      await expect(service.reactivateUser('t-5', schoolAdmin)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
