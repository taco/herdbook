import DataLoader from 'dataloader';
import { prisma } from './db';
import { Horse, Rider } from '@prisma/client';

export const createLoaders = () => ({
    horse: new DataLoader<string, Horse | null>(async (ids) => {
        const horses = await prisma.horse.findMany({
            where: {
                id: { in: [...ids] },
            },
        });
        return ids.map((id) => horses.find((horse) => horse.id === id) ?? null);
    }),
    rider: new DataLoader<string, Rider | null>(async (ids) => {
        const riders = await prisma.rider.findMany({
            where: {
                id: { in: [...ids] },
            },
        });
        return ids.map((id) => riders.find((rider) => rider.id === id) ?? null);
    }),
});

export type Loaders = ReturnType<typeof createLoaders>;
