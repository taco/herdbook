import crypto from 'node:crypto';

/** Generate an 8-character uppercase hex invite code. */
export function generateInviteCode(): string {
    return crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 8);
}
