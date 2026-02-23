// Shared GraphQL query/mutation strings for access-gating tests.
// These mirror the schema in src/graphql/schema.graphql — update here when the schema changes.

// ── Mutations ────────────────────────────────────────────────────────

export const CREATE_HORSE = /* GraphQL */ `
    mutation CreateHorse($name: String!, $notes: String) {
        createHorse(name: $name, notes: $notes) {
            id
            name
            notes
        }
    }
`;

export const UPDATE_HORSE = /* GraphQL */ `
    mutation UpdateHorse(
        $id: ID!
        $name: String
        $notes: String
        $isActive: Boolean
    ) {
        updateHorse(id: $id, name: $name, notes: $notes, isActive: $isActive) {
            id
            name
            notes
            isActive
        }
    }
`;

export const CREATE_SESSION = /* GraphQL */ `
    mutation CreateSession(
        $horseId: ID!
        $riderId: ID
        $date: DateTime!
        $durationMinutes: Int!
        $workType: WorkType!
        $intensity: Intensity
        $rating: Int
        $notes: String!
    ) {
        createSession(
            horseId: $horseId
            riderId: $riderId
            date: $date
            durationMinutes: $durationMinutes
            workType: $workType
            intensity: $intensity
            rating: $rating
            notes: $notes
        ) {
            id
            date
            durationMinutes
            workType
            intensity
            rating
            notes
        }
    }
`;

export const UPDATE_SESSION = /* GraphQL */ `
    mutation UpdateSession(
        $id: ID!
        $horseId: ID
        $date: DateTime
        $durationMinutes: Int
        $workType: WorkType
        $intensity: Intensity
        $rating: Int
        $notes: String
    ) {
        updateSession(
            id: $id
            horseId: $horseId
            date: $date
            durationMinutes: $durationMinutes
            workType: $workType
            intensity: $intensity
            rating: $rating
            notes: $notes
        ) {
            id
            date
            durationMinutes
            workType
            intensity
            rating
            notes
        }
    }
`;

export const DELETE_SESSION = /* GraphQL */ `
    mutation DeleteSession($id: ID!) {
        deleteSession(id: $id)
    }
`;

// ── Queries ──────────────────────────────────────────────────────────

export const GET_HORSES = /* GraphQL */ `
    query Horses {
        horses {
            id
            name
        }
    }
`;

export const GET_RIDERS = /* GraphQL */ `
    query Riders {
        riders {
            id
            name
        }
    }
`;

export const GET_SESSIONS = /* GraphQL */ `
    query Sessions($limit: Int) {
        sessions(limit: $limit) {
            id
            date
            durationMinutes
            workType
            notes
        }
    }
`;

export const GET_HORSE = /* GraphQL */ `
    query Horse($id: ID!) {
        horse(id: $id) {
            id
            name
        }
    }
`;

export const GET_LAST_SESSION_FOR_HORSE = /* GraphQL */ `
    query LastSessionForHorse($horseId: ID!) {
        lastSessionForHorse(horseId: $horseId) {
            id
            date
            durationMinutes
            workType
            notes
        }
    }
`;

export const GET_SESSION = /* GraphQL */ `
    query Session($id: ID!) {
        session(id: $id) {
            id
            date
            durationMinutes
            workType
            notes
        }
    }
`;
