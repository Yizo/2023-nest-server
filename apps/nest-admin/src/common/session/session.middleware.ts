import { Injectable, NestMiddleware } from '@nestjs/common';
import * as session from 'express-session';
import { SessionService } from './session.service';

@Injectable()
export class SessionMiddleware implements NestMiddleware {
  constructor(private readonly sessionService: SessionService) {}

  async use(req: any, res: any, next: () => void) {
    const sessionConfig = await this.sessionService.getSessionConfig();

    return session(sessionConfig)(req, res, next);
  }
}
