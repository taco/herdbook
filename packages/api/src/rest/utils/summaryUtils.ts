/**
 * Sliding cooldown for summary refresh based on recency of last session.
 *
 * Active horse (<7 days since last session): 48h cooldown
 * Moderate (7-14 days): 72h cooldown
 * Idle (>14 days): 168h (7 day) cooldown
 */
export function getRefreshCooldownHours(latestSessionDate: Date): number {
    const daysSinceLastSession = Math.floor(
        (Date.now() - latestSessionDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastSession < 7) return 48;
    if (daysSinceLastSession < 14) return 72;
    return 168;
}
