export function getJwtSecretOrThrow(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error(
            'Missing required env var: JWT_SECRET (required to sign/verify JWTs)'
        );
    }
    return secret;
}

export function getJwtExpiration(): string {
    return process.env.JWT_EXPIRATION ?? '1h';
}
