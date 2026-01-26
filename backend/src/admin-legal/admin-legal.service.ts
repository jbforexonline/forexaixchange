import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { sanitizeLegalContent } from '../legal/legal.service';
import { toLegalDocumentType } from '../legal/legal.constants';
import type { LegalType } from '../legal/legal.constants';

export interface CreateDraftDto {
  version: string;
  content: string;
  effectiveAt: string; // ISO date
}

@Injectable()
export class AdminLegalService {
  constructor(private prisma: PrismaService) {}

  async createDraft(type: LegalType, dto: CreateDraftDto, adminId: string) {
    const docType = toLegalDocumentType(type);
    const content = sanitizeLegalContent(dto.content);
    const effectiveAt = new Date(dto.effectiveAt);
    if (isNaN(effectiveAt.getTime()))
      throw new BadRequestException('Invalid effectiveAt date');

    const existing = await this.prisma.legalDocument.findUnique({
      where: { type_version: { type: docType, version: dto.version } },
    });
    if (existing)
      throw new BadRequestException(`Version ${dto.version} already exists for ${type}`);

    return this.prisma.legalDocument.create({
      data: {
        type: docType,
        version: dto.version,
        content,
        effectiveAt,
        isActive: false,
        createdByAdminId: adminId,
      },
    });
  }

  async activate(id: string) {
    const doc = await this.prisma.legalDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Legal document not found');

    return this.prisma.$transaction(async (tx) => {
      await tx.legalDocument.updateMany({
        where: { type: doc.type, isActive: true },
        data: { isActive: false },
      });
      return tx.legalDocument.update({
        where: { id },
        data: { isActive: true },
      });
    });
  }

  async listVersions(type: LegalType) {
    const docType = toLegalDocumentType(type);
    const list = await this.prisma.legalDocument.findMany({
      where: { type: docType },
      orderBy: [{ effectiveAt: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        type: true,
        version: true,
        effectiveAt: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        createdByAdminId: true,
      },
    });
    return list;
  }

  async getById(id: string) {
    const doc = await this.prisma.legalDocument.findUnique({
      where: { id },
      include: {
        createdByAdmin: { select: { id: true, username: true } },
      },
    });
    if (!doc) throw new NotFoundException('Legal document not found');
    return doc;
  }
}
