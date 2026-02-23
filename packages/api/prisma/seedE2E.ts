import bcrypt from 'bcrypt';
import { prisma } from '../src/db';
import {
    TEST_RIDER_EMAIL,
    TEST_RIDER_PASSWORD,
    TEST_RIDER_NAME,
    TEST_HORSE_NAME,
    TEST_SESSION_NOTE,
} from '../../e2e/tests/seedConstants';

async function seedE2E() {
    // Create a test rider with known credentials
    const testRiderEmail = TEST_RIDER_EMAIL;
    const testRiderPassword = TEST_RIDER_PASSWORD;

    // Check if rider already exists
    const existingRider = await prisma.rider.findUnique({
        where: { email: testRiderEmail },
    });

    let rider;
    if (existingRider) {
        // Update password in case it changed
        const hashedPassword = await bcrypt.hash(testRiderPassword, 10);
        rider = await prisma.rider.update({
            where: { id: existingRider.id },
            data: { password: hashedPassword, role: 'TRAINER' },
        });
    } else {
        const hashedPassword = await bcrypt.hash(testRiderPassword, 10);
        rider = await prisma.rider.create({
            data: {
                name: TEST_RIDER_NAME,
                email: testRiderEmail,
                password: hashedPassword,
                role: 'TRAINER',
            },
        });
    }

    // Create a test horse
    const testHorseName = TEST_HORSE_NAME;
    let horse = await prisma.horse.findFirst({
        where: { name: testHorseName },
    });

    if (!horse) {
        horse = await prisma.horse.create({
            data: {
                name: testHorseName,
                notes: 'Test horse for E2E tests',
            },
        });
    }

    // Create a seeded session so edit/delete tests don't need to create through the UI
    const existingSession = await prisma.session.findFirst({
        where: { notes: TEST_SESSION_NOTE },
    });

    if (!existingSession) {
        await prisma.session.create({
            data: {
                horseId: horse.id,
                riderId: rider.id,
                date: new Date(),
                durationMinutes: 45,
                workType: 'FLATWORK',
                notes: TEST_SESSION_NOTE,
            },
        });
    }

    console.log('E2E seed completed:');
    console.log(`  Rider: ${rider.email} (${rider.id})`);
    console.log(`  Horse: ${horse.name} (${horse.id})`);
}

async function main() {
    await seedE2E();
}

main()
    .catch((err) => {
        console.error(err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
