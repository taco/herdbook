import { getTestPrisma } from './db';

interface TestBarn {
    barnId: string;
    cleanup: () => Promise<void>;
}

export async function createTestBarn(inviteCode: string): Promise<TestBarn> {
    const prisma = getTestPrisma();

    const barn = await prisma.barn.create({
        data: { name: 'Signup Test Barn', inviteCode },
    });

    return {
        barnId: barn.id,
        cleanup: async () => {
            const riders = await prisma.rider.findMany({
                where: { barnId: barn.id },
                select: { id: true },
            });
            if (riders.length > 0) {
                await prisma.session.deleteMany({
                    where: { riderId: { in: riders.map((r) => r.id) } },
                });
            }
            await prisma.horse.deleteMany({ where: { barnId: barn.id } });
            await prisma.rider.deleteMany({ where: { barnId: barn.id } });
            await prisma.barn.delete({ where: { id: barn.id } });
        },
    };
}
