import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { LegalService } from '../legal.service';
import { LEGAL_REACCEPT_REQUIRED, AGE_CONFIRM_REQUIRED } from '../legal.constants';

@Injectable()
export class LegalComplianceGuard implements CanActivate {
  constructor(private legalService: LegalService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user as { id: string } | undefined;
    if (!user?.id) {
      throw new ForbiddenException({ code: 'AGE_CONFIRM_REQUIRED', message: 'Authentication required' });
    }

    const result = await this.legalService.checkUserCompliance(user.id);
    if (result.ok) return true;

    // Narrow the result to the non-ok branch for TypeScript
    const code = (result as { ok: false; code: 'LEGAL_REACCEPT_REQUIRED' | 'AGE_CONFIRM_REQUIRED' }).code;

    throw new ForbiddenException({
      code,
      message:
        code === 'AGE_CONFIRM_REQUIRED'
          ? 'You must confirm you are 18 or older to continue.'
          : 'You must accept the current Terms & Conditions and Privacy Policy to continue.',
    });
  }
}
