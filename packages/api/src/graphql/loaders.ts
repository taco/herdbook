import DataLoader from 'dataloader';
import { prisma } from '@/db';
import type { Barn, Horse, Prisma, Session } from '@prisma/client';

type RiderSafe = Prisma.RiderGetPayload<{ omit: { password: true } }>;

/** Group rows by a foreign key, preserving request order and defaulting to []. */
function groupByKey<T>(
    ids: readonly string[],
    rows: T[],
    keyFn: (row: T) => string
): T[][] {
    const map = new Map<string, T[]>();
    for (const row of rows) {
        const key = keyFn(row);
        const arr = map.get(key);
        if (arr) arr.push(row);
        else map.set(key, [row]);
    }
    return ids.map((id) => map.get(id) ?? []);
}

export const createLoaders = () => ({
    horse: new DataLoader<string, Horse | null>(async (ids) => {
        const horses = await prisma.horse.findMany({
            where: { id: { in: [...ids] } },
        });
        return ids.map((id) => horses.find((h) => h.id === id) ?? null);
    }),
    rider: new DataLoader<string, RiderSafe | null>(async (ids) => {
        const riders = await prisma.rider.findMany({
            where: { id: { in: [...ids] } },
            omit: { password: true },
        });
        return ids.map((id) => riders.find((r) => r.id === id) ?? null);
    }),
    barn: new DataLoader<string, Barn | null>(async (ids) => {
        const barns = await prisma.barn.findMany({
            where: { id: { in: [...ids] } },
        });
        return ids.map((id) => barns.find((b) => b.id === id) ?? null);
    }),
    sessionsByHorseId: new DataLoader<string, Session[]>(async (ids) => {
        const sessions = await prisma.session.findMany({
            where: { horseId: { in: [...ids] } },
        });
        return groupByKey(ids, sessions, (s) => s.horseId);
    }),
    sessionsByRiderId: new DataLoader<string, Session[]>(async (ids) => {
        const sessions = await prisma.session.findMany({
            where: { riderId: { in: [...ids] } },
        });
        return groupByKey(ids, sessions, (s) => s.riderId);
    }),
    ridersByBarnId: new DataLoader<string, RiderSafe[]>(async (ids) => {
        const riders = await prisma.rider.findMany({
            where: { barnId: { in: [...ids] } },
            omit: { password: true },
        });
        return groupByKey(ids, riders, (r) => r.barnId);
    }),
});

export type Loaders = ReturnType<typeof createLoaders>;
