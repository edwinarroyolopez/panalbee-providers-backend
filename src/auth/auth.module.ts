import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';

import { UsersModule } from '../users/users.module';
import { AccountsModule } from 'src/accounts/accounts.module';

import { jwtConstants } from './constants';
import type { StringValue } from 'ms';

@Module({
  imports: [
    UsersModule,
    AccountsModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: {
        expiresIn: jwtConstants.expiresIn as StringValue,
      },
    }),
  ],

  providers: [AuthService, JwtStrategy],

  controllers: [AuthController],

  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
