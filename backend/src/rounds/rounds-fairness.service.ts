// =============================================================================
// ROUNDS FAIRNESS SERVICE - Cryptographic Fairness Implementation
// =============================================================================
// Path: backend/src/rounds/rounds-fairness.service.ts
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class RoundsFairnessService {
  private readonly logger = new Logger(RoundsFairnessService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Generate cryptographic commitment for round fairness
   */
  generateCommitment(openedAt: Date, secret: string) {
    const commitHash = crypto
      .createHash('sha256')
      .update(`${openedAt.getTime()}||${secret}`)
      .digest('hex');

    return {
      commitHash,
      secret,
      artifactData: {
        timestamp: openedAt.getTime(),
        secret: secret,
        algorithm: 'sha256',
        version: '1.0'
      }
    };
  }

  /**
   * Verify commitment integrity
   */
  verifyCommitment(commitHash: string, timestamp: number, secret: string): boolean {
    const expectedHash = crypto
      .createHash('sha256')
      .update(`${timestamp}||${secret}`)
      .digest('hex');
    
    return commitHash === expectedHash;
  }

  /**
   * Generate random secret for fairness
   */
  generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
