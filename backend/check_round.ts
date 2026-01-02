
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const latestRound = await prisma.round.findFirst({
    orderBy: { roundNumber: 'desc' },
  });
  console.log('Latest Round:', latestRound);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
