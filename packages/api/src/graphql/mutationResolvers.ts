import { GraphQLError } from 'graphql';
import { WorkType, Intensity, RiderRole, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '@/db';
import { getJwtExpiration, getJwtSecretOrThrow } from '@/config';
import { generateInviteCode } from '@/utils/inviteCode';
import {
    getBarnId,
    requireTrainer,
    requireOwnerOrTrainer,
} from './utils/authGuard';
import type { GqlLimiters } from './utils/gqlRateLimit';
import { wrapResolver } from './utils/resolverWrapper';

export function buildMutationResolvers(
    limiters: GqlLimiters
): Record<string, unknown> {
    return {
        createHorse: wrapResolver(
            limiters,
            'write',
            async (_, args, context) => {
                const { name, notes } = args as {
                    name: string;
                    notes?: string;
                };
                requireTrainer(context);
                return prisma.horse.create({
                    data: {
                        name,
                        notes,
                        barnId: context.rider!.barnId,
                    },
                });
            }
        ),
        updateHorse: wrapResolver(
            limiters,
            'write',
            async (_, args, context) => {
                const { id, name, notes, isActive } = args as {
                    id: string;
                    name?: string;
                    notes?: string;
                    isActive?: boolean;
                };
                requireTrainer(context);
                const barnId = context.rider!.barnId;
                const existing = await prisma.horse.findFirst({
                    where: { id, barnId },
                });
                if (!existing) {
                    throw new GraphQLError('Horse not found', {
                        extensions: { code: 'NOT_FOUND' },
                    });
                }
                const updateData: {
                    name?: string;
                    notes?: string;
                    isActive?: boolean;
                } = {};
                if (name !== undefined) updateData.name = name;
                if (notes !== undefined) updateData.notes = notes;
                if (isActive !== undefined) updateData.isActive = isActive;
                return prisma.horse.update({
                    where: { id },
                    data: updateData,
                });
            }
        ),
        createSession: wrapResolver(
            limiters,
            'write',
            async (_, args, context) => {
                const {
                    horseId,
                    riderId: argRiderId,
                    date,
                    durationMinutes,
                    workType,
                    intensity,
                    rating,
                    notes,
                } = args as {
                    horseId: string;
                    riderId?: string;
                    date: Date;
                    durationMinutes: number;
                    workType: WorkType;
                    intensity?: Intensity;
                    rating?: number;
                    notes: string;
                };
                if (
                    rating !== undefined &&
                    rating !== null &&
                    (rating < 1 || rating > 5)
                ) {
                    throw new GraphQLError('Rating must be between 1 and 5', {
                        extensions: { code: 'BAD_USER_INPUT' },
                    });
                }
                // Verify horse belongs to rider's barn
                const barnId = context.rider!.barnId;
                const horse = await prisma.horse.findFirst({
                    where: { id: horseId, barnId },
                });
                if (!horse) {
                    throw new GraphQLError('Horse not found', {
                        extensions: { code: 'NOT_FOUND' },
                    });
                }
                // Riders can only create sessions for themselves;
                // trainers can specify any riderId
                if (
                    argRiderId &&
                    argRiderId !== context.rider!.id &&
                    context.rider!.role !== RiderRole.TRAINER
                ) {
                    throw new GraphQLError(
                        'You can only create sessions for yourself',
                        { extensions: { code: 'FORBIDDEN' } }
                    );
                }
                // Verify target rider is in same barn (when trainer assigns)
                if (argRiderId && argRiderId !== context.rider!.id) {
                    const targetRider = await prisma.rider.findFirst({
                        where: { id: argRiderId, barnId },
                        omit: { password: true },
                    });
                    if (!targetRider) {
                        throw new GraphQLError('Rider not found', {
                            extensions: { code: 'NOT_FOUND' },
                        });
                    }
                }
                const riderId =
                    context.rider!.role === RiderRole.TRAINER && argRiderId
                        ? argRiderId
                        : context.rider!.id;
                return prisma.session.create({
                    data: {
                        horseId,
                        date,
                        durationMinutes,
                        workType,
                        intensity,
                        rating,
                        notes,
                        riderId,
                    },
                });
            }
        ),
        updateSession: wrapResolver(
            limiters,
            'write',
            async (_, args, context) => {
                const {
                    id,
                    horseId,
                    riderId,
                    date,
                    durationMinutes,
                    workType,
                    intensity,
                    rating,
                    notes,
                } = args as {
                    id: string;
                    horseId?: string;
                    riderId?: string;
                    date?: Date;
                    durationMinutes?: number;
                    workType?: WorkType;
                    intensity?: Intensity;
                    rating?: number;
                    notes?: string;
                };
                if (
                    rating !== undefined &&
                    rating !== null &&
                    (rating < 1 || rating > 5)
                ) {
                    throw new GraphQLError('Rating must be between 1 and 5', {
                        extensions: { code: 'BAD_USER_INPUT' },
                    });
                }
                const barnId = context.rider!.barnId;
                const existing = await prisma.session.findFirst({
                    where: { id, horse: { barnId } },
                });
                if (!existing) {
                    throw new GraphQLError('Session not found', {
                        extensions: { code: 'NOT_FOUND' },
                    });
                }
                requireOwnerOrTrainer(context, existing.riderId);
                // Only trainers can reassign a session to a different rider
                if (
                    riderId !== undefined &&
                    riderId !== existing.riderId &&
                    context.rider!.role !== RiderRole.TRAINER
                ) {
                    throw new GraphQLError(
                        'Only trainers can reassign sessions',
                        { extensions: { code: 'FORBIDDEN' } }
                    );
                }
                // Verify new horse is in same barn
                if (horseId !== undefined) {
                    const newHorse = await prisma.horse.findFirst({
                        where: { id: horseId, barnId },
                    });
                    if (!newHorse) {
                        throw new GraphQLError('Horse not found', {
                            extensions: { code: 'NOT_FOUND' },
                        });
                    }
                }
                // Verify new rider is in same barn
                if (riderId !== undefined && riderId !== existing.riderId) {
                    const newRider = await prisma.rider.findFirst({
                        where: { id: riderId, barnId },
                        omit: { password: true },
                    });
                    if (!newRider) {
                        throw new GraphQLError('Rider not found', {
                            extensions: { code: 'NOT_FOUND' },
                        });
                    }
                }
                const updateData: Prisma.SessionUpdateInput = {};
                if (horseId !== undefined)
                    updateData.horse = { connect: { id: horseId } };
                if (riderId !== undefined)
                    updateData.rider = { connect: { id: riderId } };
                if (date !== undefined) updateData.date = date;
                if (durationMinutes !== undefined)
                    updateData.durationMinutes = durationMinutes;
                if (workType !== undefined) updateData.workType = workType;
                if (intensity !== undefined) updateData.intensity = intensity;
                if (rating !== undefined) updateData.rating = rating;
                if (notes !== undefined) updateData.notes = notes;
                return prisma.session.update({
                    where: { id },
                    data: updateData,
                });
            }
        ),
        updateBarn: wrapResolver(
            limiters,
            'write',
            async (_, args, context) => {
                const { name } = args as { name: string };
                requireTrainer(context);
                const trimmed = name.trim();
                if (trimmed.length === 0) {
                    throw new GraphQLError('Name cannot be empty', {
                        extensions: { code: 'BAD_USER_INPUT' },
                    });
                }
                if (trimmed.length > 100) {
                    throw new GraphQLError(
                        'Name cannot exceed 100 characters',
                        { extensions: { code: 'BAD_USER_INPUT' } }
                    );
                }
                return prisma.barn.update({
                    where: { id: context.rider!.barnId },
                    data: { name: trimmed },
                });
            }
        ),
        regenerateInviteCode: wrapResolver(
            limiters,
            'write',
            async (_, __, context) => {
                requireTrainer(context);
                return prisma.barn.update({
                    where: { id: context.rider!.barnId },
                    data: { inviteCode: generateInviteCode() },
                });
            }
        ),
        deleteSession: wrapResolver(
            limiters,
            'write',
            async (_, args, context) => {
                const { id } = args as { id: string };
                const barnId = getBarnId(context);
                const existing = await prisma.session.findFirst({
                    where: { id, horse: { barnId } },
                });
                if (!existing) {
                    throw new GraphQLError('Session not found', {
                        extensions: { code: 'NOT_FOUND' },
                    });
                }
                requireOwnerOrTrainer(context, existing.riderId);
                await prisma.session.delete({ where: { id } });
                return true;
            }
        ),
        signup: wrapResolver(limiters, 'auth', async (_, args, context) => {
            const { name, email, password, inviteCode } = args as {
                name: string;
                email: string;
                password: string;
                inviteCode: string;
            };
            const barn = await prisma.barn.findUnique({
                where: {
                    inviteCode: inviteCode.trim().toUpperCase(),
                },
            });
            if (!barn) {
                throw new GraphQLError('Invalid invite code', {
                    extensions: { code: 'INVALID_INVITE_CODE' },
                });
            }
            const existingRider = await prisma.rider.findUnique({
                where: { email },
                omit: { password: true },
            });
            if (existingRider) {
                throw new GraphQLError('Email already in use', {
                    extensions: { code: 'EMAIL_IN_USE' },
                });
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            let rider;
            try {
                rider = await prisma.rider.create({
                    data: {
                        name,
                        email,
                        password: hashedPassword,
                        barnId: barn.id,
                    },
                });
            } catch (e) {
                if (
                    e instanceof Prisma.PrismaClientKnownRequestError &&
                    e.code === 'P2002'
                ) {
                    throw new GraphQLError('Email already in use', {
                        extensions: { code: 'EMAIL_IN_USE' },
                    });
                }
                throw e;
            }
            const token = jwt.sign(
                { riderId: rider.id },
                getJwtSecretOrThrow(),
                { expiresIn: getJwtExpiration() }
            );
            const { password: _password, ...safeRider } = rider;
            context.rider = safeRider;
            return { token };
        }),
        login: wrapResolver(limiters, 'auth', async (_, args, context) => {
            const { email, password } = args as {
                email: string;
                password: string;
            };
            const rider = await prisma.rider.findUnique({
                where: { email },
            });
            if (!rider) {
                throw new GraphQLError('Invalid email or password', {
                    extensions: {
                        code: 'INVALID_CREDENTIALS',
                    },
                });
            }
            const passwordMatch = await bcrypt.compare(
                password,
                rider.password
            );
            if (!passwordMatch) {
                throw new GraphQLError('Invalid email or password', {
                    extensions: {
                        code: 'INVALID_CREDENTIALS',
                    },
                });
            }
            const token = jwt.sign(
                { riderId: rider.id },
                getJwtSecretOrThrow(),
                { expiresIn: getJwtExpiration() }
            );
            const { password: _password, ...safeRider } = rider;
            context.rider = safeRider;
            return { token };
        }),
    };
}
