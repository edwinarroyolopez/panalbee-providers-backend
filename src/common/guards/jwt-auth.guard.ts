import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import Logger from 'src/utils/logger/logger';

const logger = new Logger('jwt-auth.guard');

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any, context: any) {
    const req = context?.switchToHttp?.().getRequest?.();

    if (err || !user) {
      logger.warn('JWT auth failed', {
        error: err?.message,
        info: info?.message || info,
        path: req?.url,
        method: req?.method,
      });

      return super.handleRequest(err, user, info, context);
    }

    const dbUser = user.user ?? user;

    const normalized = {
      sub: user.sub ?? dbUser._id?.toString?.() ?? user._id?.toString?.(),
      role: user.role ?? dbUser.role,
      phone: user.phone ?? dbUser.phone,
      accountId: user.accountId ?? dbUser.accountId?.toString?.(),
    };

    logger.debug('JWT auth success', {
      path: req?.url,
      method: req?.method,
      normalized,
    });

    return normalized;
  }
}
