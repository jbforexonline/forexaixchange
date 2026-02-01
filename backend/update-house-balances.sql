-- Update house account balances
UPDATE "LedgerAccount" SET balance = 5000 WHERE id = 'SYS_HOUSE_PROFIT';
UPDATE "LedgerAccount" SET balance = 20000 WHERE id = 'SYS_RESERVE_FUND';
UPDATE "LedgerAccount" SET balance = 10000 WHERE id = 'SYS_OPERATING_CAPITAL';
UPDATE "LedgerAccount" SET balance = 0 WHERE id = 'SYS_CLEARING';
UPDATE "LedgerAccount" SET balance = 500 WHERE id = 'SYS_FEE_COLLECTION';
