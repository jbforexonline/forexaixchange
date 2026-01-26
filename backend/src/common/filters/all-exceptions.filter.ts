import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const raw =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const message = typeof raw === 'string' ? raw : (raw as any).message ?? 'Internal server error';
    const msgStr = Array.isArray(message) ? message.join(', ') : String(message);
    const code = typeof raw === 'object' && raw !== null && 'code' in (raw as object)
      ? (raw as { code: string }).code
      : undefined;

    if (status >= 500) {
      this.logger.error(
        `❌ ${request.method} ${request.url} - ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else if (status >= 400) {
      this.logger.warn(
        `⚠️ ${request.method} ${request.url} - ${status} - ${msgStr}`,
      );
    }

    const body: Record<string, unknown> = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: msgStr,
    };
    if (code) body.code = code;
    response.status(status).json(body);
  }
}
