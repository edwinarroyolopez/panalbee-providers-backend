import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { jwtConstants } from './constants';

export type AccessTokenPayload = {
  sub: string;
  phone?: string;
  role: string;
  accountId: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: jwtConstants.secret,
    });
  }

  async validate(payload: AccessTokenPayload) {
    return {
      sub: payload.sub,
      phone: payload.phone,
      role: payload.role,
      accountId: payload.accountId,
    };
  }
}
