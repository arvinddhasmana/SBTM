/**
 * PageVisibilityController
 *
 * Exposes page visibility management endpoints.
 *
 * GET  /api/v1/page-visibility   — readable by all admin roles so the sidebar
 *                                   can filter nav items for every user.
 * PUT  /api/v1/page-visibility   — SUPER_ADMIN only. Upserts one page record.
 *
 * pageKey is validated against the known set of hideable pages.
 * updatedBy is always the authenticated user's ID — never from the request body.
 *
 * Classification: T2 — admin configuration, no student PII.
 */
import {
  Controller,
  Get,
  Put,
  Body,
  Request,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '@sbtm/common';
import {
  PageVisibilityService,
  HIDEABLE_PAGE_KEYS,
  type HideablePageKey,
} from '../services/page-visibility.service';

interface UpdatePageVisibilityBody {
  pageKey: string;
  isVisible: boolean;
  pageName: string;
}

interface RequestWithUser {
  user: { id: string; role: Role };
}

@Controller('page-visibility')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PageVisibilityController {
  constructor(private readonly pageVisibilityService: PageVisibilityService) {}

  /**
   * GET /api/v1/page-visibility
   * Returns visibility state for all hideable pages.
   * All admin roles may read — each user's sidebar uses this to filter nav items.
   */
  @Get()
  @Roles(Role.SUPER_ADMIN, Role.STA_ADMIN, Role.BOARD_ADMIN, Role.SCHOOL_ADMIN)
  async findAll() {
    return this.pageVisibilityService.findAll();
  }

  /**
   * PUT /api/v1/page-visibility
   * Upserts visibility for one page. SUPER_ADMIN only.
   * pageKey must be a known hideable page key.
   * updatedBy is derived from the authenticated JWT, never from the request body.
   */
  @Put()
  @Roles(Role.SUPER_ADMIN)
  async update(
    @Body() body: UpdatePageVisibilityBody,
    @Request() req: RequestWithUser,
  ) {
    const { pageKey, isVisible, pageName } = body;

    if (!pageKey || !HIDEABLE_PAGE_KEYS.includes(pageKey as HideablePageKey)) {
      throw new BadRequestException(
        `Invalid pageKey. Must be one of: ${HIDEABLE_PAGE_KEYS.join(', ')}`,
      );
    }
    if (typeof isVisible !== 'boolean') {
      throw new BadRequestException('isVisible must be a boolean');
    }
    if (
      !pageName ||
      typeof pageName !== 'string' ||
      pageName.trim().length === 0
    ) {
      throw new BadRequestException('pageName is required');
    }

    return this.pageVisibilityService.update(
      pageKey as HideablePageKey,
      isVisible,
      pageName.trim(),
      req.user.id,
    );
  }
}
