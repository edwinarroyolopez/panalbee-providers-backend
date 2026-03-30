import {
  Body,
  Controller,
  ForbiddenException,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AccountsService } from './accounts.service';
import { UsersService } from 'src/users/users.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/users/schemas/user.schema';
import { AdminApplySubscriptionDto } from './dto/admin-apply-subscription.dto';
import { hasAccountPermission } from './constants/account-permissions.constants';

@Controller('admin/accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminAccountsController {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly usersService: UsersService,
  ) {}

  @Patch('subscription')
  @Roles(Role.OWNER, Role.ADMIN)
  async applySubscription(
    @Body() dto: AdminApplySubscriptionDto,
    @Req() req: any,
  ) {
    const operatorAccount = await this.accountsService.findById(
      req.user.accountId,
    );
    if (!hasAccountPermission(operatorAccount.permissions, 'PLATFORM_ADMIN')) {
      throw new ForbiddenException();
    }

    const account = await this.accountsService.applySubscription({
      accountId: dto.targetAccountId,
      tier: dto.tier,
      billingPlan: dto.billingPlan,
      months: dto.months,
      permissions: dto.permissions,
      activatedByUserId: req.user.sub,
      externalReference: dto.externalReference,
      notes: dto.notes,
    });

    await this.usersService.updateUsersAccountTier(
      dto.targetAccountId,
      dto.tier,
    );

    return {
      ok: true,
      accountId: account._id.toString(),
      tier: account.tier,
      billingPlan: account.billingPlan,
      subscriptionEndsAt: account.subscriptionEndsAt,
    };
  }
}
