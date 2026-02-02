import { networkInterfaces } from 'os';

export function isDevelopment(): boolean {
    return process.env.NODE_ENV !== 'production';
}

export function getLocalNetworkIPs(): string[] {
    const ips: string[] = [];
    const interfaces = networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name] ?? []) {
            if (iface.family === 'IPv4' && !iface.internal) {
                ips.push(iface.address);
            }
        }
    }
    return ips;
}

function isPrivateIP(ip: string): boolean {
    if (ip.startsWith('10.')) return true;
    if (ip.startsWith('172.')) {
        const second = parseInt(ip.split('.')[1], 10);
        if (second >= 16 && second <= 31) return true;
    }
    if (ip.startsWith('192.168.')) return true;
    return false;
}

export function getServerHost(): string {
    if (isDevelopment()) return '0.0.0.0';
    return process.env.HOST ?? '127.0.0.1';
}

type CorsCallback = (err: Error | null, allow: boolean) => void;
type CorsOriginFunction = (
    origin: string | undefined,
    callback: CorsCallback
) => void;

export function getCorsOrigin(): CorsOriginFunction {
    if (isDevelopment()) {
        const localIPs = getLocalNetworkIPs();
        console.log(
            '[CORS] Development mode - allowing localhost and local IPs:',
            localIPs
        );

        return (origin: string | undefined, callback: CorsCallback): void => {
            if (!origin) {
                console.log('[CORS] Allowed: no origin (curl, Postman, etc.)');
                callback(null, true);
                return;
            }
            try {
                const hostname = new URL(origin).hostname;
                if (hostname === 'localhost' || hostname === '127.0.0.1') {
                    console.log(`[CORS] Allowed: ${origin} (localhost)`);
                    callback(null, true);
                    return;
                }
                if (isPrivateIP(hostname)) {
                    console.log(`[CORS] Allowed: ${origin} (private IP)`);
                    callback(null, true);
                    return;
                }
                if (localIPs.includes(hostname)) {
                    console.log(`[CORS] Allowed: ${origin} (local network IP)`);
                    callback(null, true);
                    return;
                }
                console.warn(`[CORS] Blocked: ${origin} (not in allowed list)`);
                callback(null, false);
            } catch (err) {
                console.warn(`[CORS] Blocked: ${origin} (invalid URL: ${err})`);
                callback(null, false);
            }
        };
    }

    // Production: require explicit config
    const originsEnv = process.env.CORS_ALLOWED_ORIGINS;
    if (!originsEnv) {
        throw new Error(
            'Missing required env var: CORS_ALLOWED_ORIGINS (comma-separated list of allowed origins)'
        );
    }
    const origins = originsEnv
        .split(',')
        .map((o) => o.trim())
        .filter((o) => o.length > 0);
    if (origins.length === 0) {
        throw new Error('CORS_ALLOWED_ORIGINS contains no valid origins');
    }
    console.log('[CORS] Production mode - allowed origins:', origins);

    return (origin: string | undefined, callback: CorsCallback): void => {
        if (!origin) {
            console.log('[CORS] Allowed: no origin (curl, Postman, etc.)');
            callback(null, true);
            return;
        }
        if (origins.includes(origin)) {
            console.log(`[CORS] Allowed: ${origin}`);
            callback(null, true);
            return;
        }
        console.warn(`[CORS] Blocked: ${origin} (not in CORS_ALLOWED_ORIGINS)`);
        callback(null, false);
    };
}

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
    return process.env.JWT_EXPIRATION ?? '30 days';
}
