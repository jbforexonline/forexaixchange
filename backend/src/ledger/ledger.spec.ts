// =============================================================================
// LEDGER SERVICE - Unit Tests
// =============================================================================

import { Test, TestingModule } from '@nestjs/testing';
import { Decimal } from '@prisma/client/runtime/library';
import { LedgerService, SYSTEM_ACCOUNTS } from './ledger.service';
import { PrismaService } from '../database/prisma.service';
import { LedgerAccountType, LedgerEntryType } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

const mockPrismaService = {
  ledgerAccount: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
  },
  ledgerEntry: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  },
  $queryRaw: jest.fn(),
};

describe('LedgerService', () => {
  let service: LedgerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LedgerService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<LedgerService>(LedgerService);
    jest.clearAllMocks();
  });

  describe('System Account Constants', () => {
    it('should have all required system accounts defined', () => {
      expect(SYSTEM_ACCOUNTS.HOUSE_PROFIT).toBe('SYS_HOUSE_PROFIT');
      expect(SYSTEM_ACCOUNTS.RESERVE_FUND).toBe('SYS_RESERVE_FUND');
      expect(SYSTEM_ACCOUNTS.OPERATING_CAPITAL).toBe('SYS_OPERATING_CAPITAL');
      expect(SYSTEM_ACCOUNTS.CLEARING).toBe('SYS_CLEARING');
      expect(SYSTEM_ACCOUNTS.FEE_COLLECTION).toBe('SYS_FEE_COLLECTION');
    });
  });

  describe('initializeSystemAccounts', () => {
    it('should create all system accounts', async () => {
      mockPrismaService.ledgerAccount.upsert.mockResolvedValue({});

      await service.initializeSystemAccounts();

      expect(mockPrismaService.ledgerAccount.upsert).toHaveBeenCalledTimes(5);
    });
  });

  describe('getOrCreateUserAccounts', () => {
    it('should return existing accounts if found', async () => {
      const userId = 'test-user-id';
      const availableAccount = { id: 'available-acc', type: LedgerAccountType.USER_AVAILABLE };
      const heldAccount = { id: 'held-acc', type: LedgerAccountType.USER_HELD };

      mockPrismaService.ledgerAccount.findFirst
        .mockResolvedValueOnce(availableAccount)
        .mockResolvedValueOnce(heldAccount);

      const result = await service.getOrCreateUserAccounts(userId);

      expect(result.availableAccount.id).toBe('available-acc');
      expect(result.heldAccount.id).toBe('held-acc');
    });

    it('should create accounts if not found', async () => {
      const userId = 'new-user-id';

      mockPrismaService.ledgerAccount.findFirst.mockResolvedValue(null);
      mockPrismaService.ledgerAccount.create
        .mockResolvedValueOnce({ id: 'new-available', type: LedgerAccountType.USER_AVAILABLE })
        .mockResolvedValueOnce({ id: 'new-held', type: LedgerAccountType.USER_HELD });

      const result = await service.getOrCreateUserAccounts(userId);

      expect(mockPrismaService.ledgerAccount.create).toHaveBeenCalledTimes(2);
      expect(result.availableAccount.id).toBe('new-available');
      expect(result.heldAccount.id).toBe('new-held');
    });
  });

  describe('getAccountBalance', () => {
    it('should calculate balance from credits minus debits', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ balance: '1000.00' }]);

      const balance = await service.getAccountBalance('test-account-id');

      expect(balance.toString()).toBe('1000');
    });

    it('should return zero for empty account', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ balance: '0' }]);

      const balance = await service.getAccountBalance('empty-account');

      expect(balance.toString()).toBe('0');
    });
  });

  describe('createLedgerEntry', () => {
    it('should reject non-positive amounts', async () => {
      await expect(
        service.createLedgerEntry({
          entryType: LedgerEntryType.DEPOSIT_CREDIT,
          debitAccountId: 'debit-acc',
          creditAccountId: 'credit-acc',
          amount: new Decimal(0),
          description: 'Test entry',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createLedgerEntry({
          entryType: LedgerEntryType.DEPOSIT_CREDIT,
          debitAccountId: 'debit-acc',
          creditAccountId: 'credit-acc',
          amount: new Decimal(-100),
          description: 'Test entry',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle idempotency', async () => {
      const existingEntry = { id: 'existing-entry-id' };
      mockPrismaService.ledgerEntry.findUnique.mockResolvedValue(existingEntry);

      const result = await service.createLedgerEntry({
        entryType: LedgerEntryType.DEPOSIT_CREDIT,
        debitAccountId: 'debit-acc',
        creditAccountId: 'credit-acc',
        amount: new Decimal(100),
        description: 'Test entry',
        idempotencyKey: 'duplicate-key',
      });

      expect(result.id).toBe('existing-entry-id');
      expect(mockPrismaService.ledgerEntry.create).not.toHaveBeenCalled();
    });

    it('should create entry with valid data', async () => {
      mockPrismaService.ledgerEntry.findUnique.mockResolvedValue(null);
      mockPrismaService.ledgerAccount.findUnique
        .mockResolvedValueOnce({ id: 'debit-acc' })
        .mockResolvedValueOnce({ id: 'credit-acc' });
      mockPrismaService.ledgerEntry.create.mockResolvedValue({
        id: 'new-entry-id',
        amount: new Decimal(100),
      });

      const result = await service.createLedgerEntry({
        entryType: LedgerEntryType.DEPOSIT_CREDIT,
        debitAccountId: 'debit-acc',
        creditAccountId: 'credit-acc',
        amount: new Decimal(100),
        description: 'Test deposit',
      });

      expect(result.id).toBe('new-entry-id');
      expect(mockPrismaService.ledgerEntry.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException for missing accounts', async () => {
      mockPrismaService.ledgerEntry.findUnique.mockResolvedValue(null);
      mockPrismaService.ledgerAccount.findUnique.mockResolvedValue(null);

      await expect(
        service.createLedgerEntry({
          entryType: LedgerEntryType.DEPOSIT_CREDIT,
          debitAccountId: 'invalid-acc',
          creditAccountId: 'also-invalid',
          amount: new Decimal(100),
          description: 'Test entry',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Double-Entry Integrity', () => {
    it('should always create balanced entries (debit = credit)', async () => {
      // Every ledger entry represents both a debit and credit of the same amount
      // This test verifies the principle is maintained
      
      const amount = new Decimal(100);
      
      mockPrismaService.ledgerEntry.findUnique.mockResolvedValue(null);
      mockPrismaService.ledgerAccount.findUnique.mockResolvedValue({ id: 'test-acc' });
      mockPrismaService.ledgerEntry.create.mockImplementation((data) => {
        // Verify the entry has both debit and credit accounts
        expect(data.data.debitAccountId).toBeDefined();
        expect(data.data.creditAccountId).toBeDefined();
        expect(data.data.amount.toString()).toBe(amount.toString());
        return Promise.resolve({ id: 'entry-id' });
      });

      await service.createLedgerEntry({
        entryType: LedgerEntryType.DEPOSIT_CREDIT,
        debitAccountId: 'source-acc',
        creditAccountId: 'dest-acc',
        amount,
        description: 'Balanced entry test',
      });
    });
  });

  describe('verifyLedgerIntegrity', () => {
    it('should return isValid true when debits equal credits', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{
        total_debits: '5000',
        total_credits: '5000',
      }]);

      const result = await service.verifyLedgerIntegrity();

      expect(result.isValid).toBe(true);
      expect(result.difference.toString()).toBe('0');
    });
  });
});

describe('Decimal Precision', () => {
  it('should maintain 2 decimal places for amounts', () => {
    const amount = new Decimal('100.50');
    expect(amount.decimalPlaces()).toBeLessThanOrEqual(2);
  });

  it('should handle large numbers without precision loss', () => {
    const largeAmount = new Decimal('999999999.99');
    const result = largeAmount.add(new Decimal('0.01'));
    expect(result.toString()).toBe('1000000000');
  });

  it('should never use floating point arithmetic', () => {
    // 0.1 + 0.2 !== 0.3 in floating point, but should be exact in Decimal
    const a = new Decimal('0.1');
    const b = new Decimal('0.2');
    const sum = a.add(b);
    expect(sum.toString()).toBe('0.3');
  });
});
