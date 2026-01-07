import { WorkType } from '@prisma/client';
import { prisma } from '../src/db';
import fs from 'node:fs';
import { parse } from 'csv-parse/sync';

type SessionCsvRow = {
    horseId: string;
    riderId: string;
    date: string;
    durationMinutes: string;
    workType: string;
    notes?: string;
};

function loadCsv(path: string): SessionCsvRow[] {
    const raw = fs.readFileSync(path, 'utf8');
    const records = parse(raw, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
    }) as SessionCsvRow[];

    return records;
}

async function seedSessions() {
    const rows = loadCsv('data/sessions.csv');

    for (const row of rows) {
        // Validate / normalize workType against enum
        const workTypeUpper =
            row.workType.toUpperCase() as keyof typeof WorkType;

        if (!WorkType[workTypeUpper]) {
            console.warn(
                `Skipping row with invalid workType "${row.workType}" for horseId=${row.horseId}, riderId=${row.riderId}`
            );
            continue;
        }

        const duration = parseInt(row.durationMinutes, 10);
        if (Number.isNaN(duration)) {
            console.warn(
                `Skipping row with invalid durationMinutes "${row.durationMinutes}" for horseId=${row.horseId}, riderId=${row.riderId}`
            );
            continue;
        }

        try {
            const notes =
                row.notes && row.notes.trim().length > 0
                    ? row.notes.trim()
                    : '';
            await prisma.session.create({
                data: {
                    horseId: row.horseId,
                    riderId: row.riderId,
                    date: new Date(row.date),
                    durationMinutes: duration,
                    workType: WorkType[workTypeUpper],
                    notes,
                },
            });
        } catch (err) {
            console.error(
                `Failed to create session for horseId=${row.horseId}, riderId=${row.riderId}`,
                err
            );
        }
    }

    console.log(`Seeded ${rows.length} session rows (attempted).`);
}

async function main() {
    await seedSessions();
}

main()
    .catch((err) => {
        console.error(err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
