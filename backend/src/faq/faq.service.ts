import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface FaqItemPublic {
  id: string;
  category: string;
  question: string;
  answer: string;
  sortOrder: number;
}

@Injectable()
export class FaqService {
  constructor(private prisma: PrismaService) {}

  /** Public: get all FAQ items grouped by category */
  async findAll(): Promise<FaqItemPublic[]> {
    const items = await this.prisma.faqItem.findMany({
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        category: true,
        question: true,
        answer: true,
        sortOrder: true,
      },
    });
    return items;
  }

  /** Admin: get one by id */
  async findOne(id: string) {
    const item = await this.prisma.faqItem.findUnique({
      where: { id },
    });
    if (!item) throw new NotFoundException('FAQ item not found');
    return item;
  }

  /** Admin: create */
  async create(data: { category: string; question: string; answer: string; sortOrder?: number }) {
    const sortOrder = data.sortOrder ?? 0;
    return this.prisma.faqItem.create({
      data: {
        category: data.category,
        question: data.question,
        answer: data.answer,
        sortOrder,
      },
    });
  }

  /** Admin: update */
  async update(
    id: string,
    data: { category?: string; question?: string; answer?: string; sortOrder?: number },
  ) {
    await this.findOne(id);
    return this.prisma.faqItem.update({
      where: { id },
      data,
    });
  }

  /** Admin: delete */
  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.faqItem.delete({
      where: { id },
    });
  }
}
