
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const frozenFull = await prisma.round.findFirst({
        where: { state: 'FROZEN' },
        orderBy: { roundNumber: 'desc' }
    });

    if (!frozenFull) {
        console.log('No FROZEN round found.');
        return;
    }

    console.log(`Force settling Round ${frozenFull.roundNumber} (${frozenFull.id})...`);

    await prisma.round.update({
        where: { id: frozenFull.id },
        data: {
            state: 'SETTLED',
            settledAt: new Date(),
            // We assume totals are already computed since it is FROZEN
        }
    });

    console.log('Round SETTLED. You can now trigger a new round.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
