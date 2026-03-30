import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccountsService } from './accounts.service';
import { AccountsController } from './accounts.controller';
import { AdminAccountsController } from './admin-accounts.controller';
import { Account, AccountSchema } from './schemas/account.schema';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Account.name, schema: AccountSchema }]),
    UsersModule,
  ],
  providers: [AccountsService],
  controllers: [AccountsController, AdminAccountsController],
  exports: [AccountsService],
})
export class AccountsModule {}
