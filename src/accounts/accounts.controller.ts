import {
  Controller,
  ForbiddenException,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';

import { AccountsService } from './accounts.service';
import { UsersService } from 'src/users/users.service';

import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/users/schemas/user.schema';

import { UpdateAccountSubscriptionDto } from './dto/update-account-subscription.dto';
import {
  ACCOUNT_PERMISSION_CATALOG,
  hasAccountPermission,
} from './constants/account-permissions.constants';
import type { AccountPermissionKey } from './constants/account-permissions.constants';

@Controller('accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AccountsController {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly usersService: UsersService,
  ) {}

  private async assertPermission(
    req: { user: { accountId: string } },
    key: AccountPermissionKey,
  ) {
    const account = await this.accountsService.findById(req.user.accountId);
    if (!hasAccountPermission(account.permissions, key)) {
      throw new ForbiddenException('Missing account permission');
    }
    return account;
  }

  @Get()
  @Roles(Role.OWNER, Role.ADMIN)
  async listAll(@Req() req: any) {
    await this.assertPermission(req, 'PLATFORM_ADMIN');
    return this.accountsService.listAll();
  }

  @Get('me')
  @Roles(Role.OWNER, Role.ADMIN, Role.MEMBER, Role.VIEWER)
  async getCurrentAccount(@Req() req: any) {
    return this.accountsService.findById(req.user.accountId);
  }

  @Get('permission-catalog')
  @Roles(Role.OWNER, Role.ADMIN)
  async permissionCatalog(@Req() req: any) {
    await this.assertPermission(req, 'PLATFORM_ADMIN');
    return {
      permissions: ACCOUNT_PERMISSION_CATALOG,
    };
  }

  @Patch(':accountId/subscription')
  @Roles(Role.OWNER, Role.ADMIN)
  async updateSubscription(
    @Param('accountId') accountId: string,
    @Body() dto: UpdateAccountSubscriptionDto,
    @Req() req: any,
  ) {
    const operatorAccount = await this.accountsService.findById(
      req.user.accountId,
    );
    const isPlatform = hasAccountPermission(
      operatorAccount.permissions,
      'PLATFORM_ADMIN',
    );
    const isSelf = accountId === req.user.accountId;

    if (!isSelf && !isPlatform) {
      throw new ForbiddenException();
    }

    if (isSelf && !isPlatform && req.user.role !== Role.OWNER) {
      throw new ForbiddenException(
        'Only the account owner can change subscription from this route',
      );
    }

    const account = await this.accountsService.applySubscription({
      accountId,
      tier: dto.tier,
      billingPlan: dto.billingPlan,
      months: dto.months,
      permissions: dto.permissions,
      activatedByUserId: req.user.sub,
    });

    await this.usersService.updateUsersAccountTier(accountId, dto.tier);

    return {
      ok: true,
      accountId,
      tier: account.tier,
      billingPlan: account.billingPlan,
      permissions: account.permissions ?? [],
      subscriptionEndsAt: account.subscriptionEndsAt,
      trialEndsAt: account.trialEndsAt,
    };
  }
}
