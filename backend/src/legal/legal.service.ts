import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { LegalDocumentType } from '@prisma/client';
import { toLegalDocumentType, type LegalType } from './legal.constants';

/** Basic sanitization: strip script/iframe, limit length. Use markdown-safe storage. */
export function sanitizeLegalContent(content: string, maxLength = 500_000): string {
  if (typeof content !== 'string') return '';
  let s = content.slice(0, maxLength);
  s = s.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  s = s.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  s = s.replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '');
  return s.trim();
}

@Injectable()
export class LegalService {
  constructor(private prisma: PrismaService) {}

  async getActive(type: LegalType) {
    const docType = toLegalDocumentType(type);
    const doc = await this.prisma.legalDocument.findFirst({
      where: { type: docType, isActive: true },
      orderBy: { effectiveAt: 'desc' },
    });
    if (!doc) return null;
    return {
      id: doc.id,
      type: doc.type.toLowerCase(),
      version: doc.version,
      content: doc.content,
      effectiveAt: doc.effectiveAt.toISOString(),
    };
  }

  async accept(
    type: LegalType,
    userId: string,
    ipAddress: string | undefined,
    userAgent: string | undefined,
  ) {
    const docType = toLegalDocumentType(type);
    const doc = await this.prisma.legalDocument.findFirst({
      where: { type: docType, isActive: true },
      orderBy: { effectiveAt: 'desc' },
    });
    if (!doc) throw new NotFoundException(`No active ${type} document found`);

    await this.prisma.userLegalAcceptance.upsert({
      where: {
        userId_legalDocumentId: { userId, legalDocumentId: doc.id },
      },
      create: {
        userId,
        legalDocumentId: doc.id,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      },
      update: {
        acceptedAt: new Date(),
        ipAddress: ipAddress ?? undefined,
        userAgent: userAgent ?? undefined,
      },
    });
    return { accepted: true, documentId: doc.id };
  }

  async checkUserCompliance(userId: string): Promise<
    | { ok: true }
    | { ok: false; code: 'AGE_CONFIRM_REQUIRED' | 'LEGAL_REACCEPT_REQUIRED' }
  > {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { legalAcceptances: { include: { legalDocument: true } } },
    });
    if (!user) return { ok: false, code: 'AGE_CONFIRM_REQUIRED' };

    // Admin users bypass age verification and legal terms checks
    const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'SYSTEM_ADMIN', 'AUDIT_ADMIN'];
    const isAdmin = adminRoles.includes(user.role);

    if (isAdmin) {
      return { ok: true };
    }

    if (!user.isAge18Confirmed) return { ok: false, code: 'AGE_CONFIRM_REQUIRED' };

    const activeTerms = await this.prisma.legalDocument.findFirst({
      where: { type: LegalDocumentType.TERMS, isActive: true },
    });
    const activePrivacy = await this.prisma.legalDocument.findFirst({
      where: { type: LegalDocumentType.PRIVACY, isActive: true },
    });

    const acceptedTermIds = new Set(
      user.legalAcceptances
        .filter((a) => a.legalDocument.type === LegalDocumentType.TERMS)
        .map((a) => a.legalDocumentId),
    );
    const acceptedPrivacyIds = new Set(
      user.legalAcceptances
        .filter((a) => a.legalDocument.type === LegalDocumentType.PRIVACY)
        .map((a) => a.legalDocumentId),
    );

    if (activeTerms && !acceptedTermIds.has(activeTerms.id))
      return { ok: false, code: 'LEGAL_REACCEPT_REQUIRED' };
    if (activePrivacy && !acceptedPrivacyIds.has(activePrivacy.id))
      return { ok: false, code: 'LEGAL_REACCEPT_REQUIRED' };

    return { ok: true };
  }

  async confirmAge(
    userId: string,
    ipAddress: string | undefined,
    userAgent: string | undefined,
  ) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isAge18Confirmed: true,
        ageConfirmedAt: new Date(),
        ageConfirmedIp: ipAddress ?? null,
        ageConfirmedUserAgent: userAgent ?? null,
      },
    });
    return { confirmed: true };
  }

  /** For admin: get active doc by type (used by legal module). */
  async getActiveDocument(type: LegalDocumentType) {
    return this.prisma.legalDocument.findFirst({
      where: { type, isActive: true },
      orderBy: { effectiveAt: 'desc' },
    });
  }
}
