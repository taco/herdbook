export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = {
    [K in keyof T]: T[K];
};
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
    [SubKey in K]?: Maybe<T[SubKey]>;
};
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
    [SubKey in K]: Maybe<T[SubKey]>;
};
export type MakeEmpty<
    T extends { [key: string]: unknown },
    K extends keyof T,
> = { [_ in K]?: never };
export type Incremental<T> =
    | T
    | {
          [P in keyof T]?: P extends ' $fragmentName' | '__typename'
              ? T[P]
              : never;
      };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
    ID: { input: string; output: string };
    String: { input: string; output: string };
    Boolean: { input: boolean; output: boolean };
    Int: { input: number; output: number };
    Float: { input: number; output: number };
    DateTime: { input: any; output: any };
};

export type AuthPayload = {
    __typename?: 'AuthPayload';
    rider: Rider;
    token: Scalars['String']['output'];
};

export type Barn = {
    __typename?: 'Barn';
    createdAt: Scalars['DateTime']['output'];
    id: Scalars['ID']['output'];
    inviteCode: Maybe<Scalars['String']['output']>;
    name: Scalars['String']['output'];
    riders: Array<Rider>;
};

export type Horse = {
    __typename?: 'Horse';
    activity: Array<WeeklyActivity>;
    barn: Barn;
    createdAt: Scalars['DateTime']['output'];
    id: Scalars['ID']['output'];
    isActive: Scalars['Boolean']['output'];
    name: Scalars['String']['output'];
    notes: Maybe<Scalars['String']['output']>;
    sessions: Array<Session>;
    summary: Maybe<HorseSummary>;
    updatedAt: Scalars['DateTime']['output'];
};

export type HorseActivityArgs = {
    weeks: InputMaybe<Scalars['Int']['input']>;
};

export type HorseSummary = {
    __typename?: 'HorseSummary';
    content: Scalars['String']['output'];
    generatedAt: Scalars['DateTime']['output'];
    refreshAvailableAt: Maybe<Scalars['DateTime']['output']>;
    stale: Scalars['Boolean']['output'];
};

export enum Intensity {
    Hard = 'HARD',
    Light = 'LIGHT',
    Moderate = 'MODERATE',
    VeryHard = 'VERY_HARD',
}

export type Mutation = {
    __typename?: 'Mutation';
    createHorse: Horse;
    createSession: Session;
    deleteSession: Scalars['Boolean']['output'];
    login: AuthPayload;
    regenerateInviteCode: Barn;
    signup: AuthPayload;
    updateBarn: Barn;
    updateHorse: Horse;
    updateSession: Session;
};

export type MutationCreateHorseArgs = {
    name: Scalars['String']['input'];
    notes: InputMaybe<Scalars['String']['input']>;
};

export type MutationCreateSessionArgs = {
    date: Scalars['DateTime']['input'];
    durationMinutes: Scalars['Int']['input'];
    horseId: Scalars['ID']['input'];
    intensity: InputMaybe<Intensity>;
    notes: Scalars['String']['input'];
    rating: InputMaybe<Scalars['Int']['input']>;
    riderId: InputMaybe<Scalars['ID']['input']>;
    workType: WorkType;
};

export type MutationDeleteSessionArgs = {
    id: Scalars['ID']['input'];
};

export type MutationLoginArgs = {
    email: Scalars['String']['input'];
    password: Scalars['String']['input'];
};

export type MutationSignupArgs = {
    email: Scalars['String']['input'];
    inviteCode: Scalars['String']['input'];
    name: Scalars['String']['input'];
    password: Scalars['String']['input'];
};

export type MutationUpdateBarnArgs = {
    name: Scalars['String']['input'];
};

export type MutationUpdateHorseArgs = {
    id: Scalars['ID']['input'];
    isActive: InputMaybe<Scalars['Boolean']['input']>;
    name: InputMaybe<Scalars['String']['input']>;
    notes: InputMaybe<Scalars['String']['input']>;
};

export type MutationUpdateSessionArgs = {
    date: InputMaybe<Scalars['DateTime']['input']>;
    durationMinutes: InputMaybe<Scalars['Int']['input']>;
    horseId: InputMaybe<Scalars['ID']['input']>;
    id: Scalars['ID']['input'];
    intensity: InputMaybe<Intensity>;
    notes: InputMaybe<Scalars['String']['input']>;
    rating: InputMaybe<Scalars['Int']['input']>;
    riderId: InputMaybe<Scalars['ID']['input']>;
    workType: InputMaybe<WorkType>;
};

export type Query = {
    __typename?: 'Query';
    barn: Barn;
    horse: Maybe<Horse>;
    horses: Array<Horse>;
    lastSessionForHorse: Maybe<Session>;
    me: Rider;
    riders: Array<Rider>;
    session: Maybe<Session>;
    sessions: Array<Session>;
};

export type QueryHorseArgs = {
    id: Scalars['ID']['input'];
};

export type QueryLastSessionForHorseArgs = {
    horseId: Scalars['ID']['input'];
};

export type QuerySessionArgs = {
    id: Scalars['ID']['input'];
};

export type QuerySessionsArgs = {
    dateFrom: InputMaybe<Scalars['DateTime']['input']>;
    dateTo: InputMaybe<Scalars['DateTime']['input']>;
    horseId: InputMaybe<Scalars['ID']['input']>;
    limit: InputMaybe<Scalars['Int']['input']>;
    offset: InputMaybe<Scalars['Int']['input']>;
    riderId: InputMaybe<Scalars['ID']['input']>;
    workType: InputMaybe<WorkType>;
};

export type Rider = {
    __typename?: 'Rider';
    barn: Barn;
    createdAt: Scalars['DateTime']['output'];
    email: Scalars['String']['output'];
    id: Scalars['ID']['output'];
    name: Scalars['String']['output'];
    role: RiderRole;
    sessions: Array<Session>;
};

export enum RiderRole {
    Rider = 'RIDER',
    Trainer = 'TRAINER',
}

export type Session = {
    __typename?: 'Session';
    createdAt: Scalars['DateTime']['output'];
    date: Scalars['DateTime']['output'];
    durationMinutes: Scalars['Int']['output'];
    horse: Horse;
    id: Scalars['ID']['output'];
    intensity: Maybe<Intensity>;
    notes: Scalars['String']['output'];
    rating: Maybe<Scalars['Int']['output']>;
    rider: Rider;
    updatedAt: Scalars['DateTime']['output'];
    workType: WorkType;
};

export type WeeklyActivity = {
    __typename?: 'WeeklyActivity';
    count: Scalars['Int']['output'];
    weekStart: Scalars['DateTime']['output'];
};

export enum WorkType {
    Flatwork = 'FLATWORK',
    Groundwork = 'GROUNDWORK',
    InHand = 'IN_HAND',
    Jumping = 'JUMPING',
    Other = 'OTHER',
    Trail = 'TRAIL',
}

export type GetBarnQueryVariables = Exact<{ [key: string]: never }>;

export type GetBarnQuery = {
    __typename?: 'Query';
    barn: {
        __typename?: 'Barn';
        id: string;
        name: string;
        inviteCode: string | null;
        riders: Array<{ __typename?: 'Rider'; id: string }>;
    };
};

export type UpdateBarnMutationVariables = Exact<{
    name: Scalars['String']['input'];
}>;

export type UpdateBarnMutation = {
    __typename?: 'Mutation';
    updateBarn: { __typename?: 'Barn'; id: string; name: string };
};

export type RegenerateInviteCodeMutationVariables = Exact<{
    [key: string]: never;
}>;

export type RegenerateInviteCodeMutation = {
    __typename?: 'Mutation';
    regenerateInviteCode: {
        __typename?: 'Barn';
        id: string;
        inviteCode: string | null;
    };
};

export type MeQueryVariables = Exact<{ [key: string]: never }>;

export type MeQuery = {
    __typename?: 'Query';
    me: { __typename?: 'Rider'; id: string; name: string; role: RiderRole };
};

export type GetHorsesQueryVariables = Exact<{ [key: string]: never }>;

export type GetHorsesQuery = {
    __typename?: 'Query';
    horses: Array<{ __typename?: 'Horse'; id: string; name: string }>;
};

export type GetRidersQueryVariables = Exact<{ [key: string]: never }>;

export type GetRidersQuery = {
    __typename?: 'Query';
    riders: Array<{ __typename?: 'Rider'; id: string; name: string }>;
};

export type GetDashboardDataQueryVariables = Exact<{ [key: string]: never }>;

export type GetDashboardDataQuery = {
    __typename?: 'Query';
    horses: Array<{
        __typename?: 'Horse';
        id: string;
        name: string;
        activity: Array<{
            __typename?: 'WeeklyActivity';
            weekStart: any;
            count: number;
        }>;
    }>;
    sessions: Array<{
        __typename?: 'Session';
        id: string;
        date: any;
        durationMinutes: number;
        workType: WorkType;
        intensity: Intensity | null;
        notes: string;
        horse: { __typename?: 'Horse'; name: string };
        rider: { __typename?: 'Rider'; name: string };
    }>;
};

export type GetHorseForEditQueryVariables = Exact<{
    id: Scalars['ID']['input'];
}>;

export type GetHorseForEditQuery = {
    __typename?: 'Query';
    horse: {
        __typename?: 'Horse';
        id: string;
        name: string;
        notes: string | null;
        isActive: boolean;
        sessions: Array<{
            __typename?: 'Session';
            id: string;
            date: any;
            durationMinutes: number;
            workType: WorkType;
            notes: string;
            horse: { __typename?: 'Horse'; name: string };
            rider: { __typename?: 'Rider'; name: string };
        }>;
    } | null;
};

export type CreateHorseMutationVariables = Exact<{
    name: Scalars['String']['input'];
    notes: InputMaybe<Scalars['String']['input']>;
}>;

export type CreateHorseMutation = {
    __typename?: 'Mutation';
    createHorse: { __typename?: 'Horse'; id: string };
};

export type UpdateHorseMutationVariables = Exact<{
    id: Scalars['ID']['input'];
    name: InputMaybe<Scalars['String']['input']>;
    notes: InputMaybe<Scalars['String']['input']>;
    isActive: InputMaybe<Scalars['Boolean']['input']>;
}>;

export type UpdateHorseMutation = {
    __typename?: 'Mutation';
    updateHorse: { __typename?: 'Horse'; id: string };
};

export type CreateSessionMutationVariables = Exact<{
    horseId: Scalars['ID']['input'];
    riderId: InputMaybe<Scalars['ID']['input']>;
    date: Scalars['DateTime']['input'];
    durationMinutes: Scalars['Int']['input'];
    workType: WorkType;
    intensity: InputMaybe<Intensity>;
    rating: InputMaybe<Scalars['Int']['input']>;
    notes: Scalars['String']['input'];
}>;

export type CreateSessionMutation = {
    __typename?: 'Mutation';
    createSession: { __typename?: 'Session'; id: string };
};

export type GetHorseProfileQueryVariables = Exact<{
    id: Scalars['ID']['input'];
}>;

export type GetHorseProfileQuery = {
    __typename?: 'Query';
    horse: {
        __typename?: 'Horse';
        id: string;
        name: string;
        notes: string | null;
        isActive: boolean;
        activity: Array<{
            __typename?: 'WeeklyActivity';
            weekStart: any;
            count: number;
        }>;
        summary: {
            __typename?: 'HorseSummary';
            content: string;
            generatedAt: any;
            stale: boolean;
            refreshAvailableAt: any | null;
        } | null;
        sessions: Array<{
            __typename?: 'Session';
            id: string;
            date: any;
            durationMinutes: number;
            workType: WorkType;
            intensity: Intensity | null;
            notes: string;
            horse: { __typename?: 'Horse'; name: string };
            rider: { __typename?: 'Rider'; name: string };
        }>;
    } | null;
};

export type GetHorsesListQueryVariables = Exact<{ [key: string]: never }>;

export type GetHorsesListQuery = {
    __typename?: 'Query';
    horses: Array<{
        __typename?: 'Horse';
        id: string;
        name: string;
        activity: Array<{
            __typename?: 'WeeklyActivity';
            weekStart: any;
            count: number;
        }>;
    }>;
};

export type LoginMutationVariables = Exact<{
    email: Scalars['String']['input'];
    password: Scalars['String']['input'];
}>;

export type LoginMutation = {
    __typename?: 'Mutation';
    login: { __typename?: 'AuthPayload'; token: string };
};

export type GetSessionForEditQueryVariables = Exact<{
    id: Scalars['ID']['input'];
}>;

export type GetSessionForEditQuery = {
    __typename?: 'Query';
    session: {
        __typename?: 'Session';
        id: string;
        date: any;
        durationMinutes: number;
        workType: WorkType;
        intensity: Intensity | null;
        rating: number | null;
        notes: string;
        horse: { __typename?: 'Horse'; id: string; name: string };
        rider: { __typename?: 'Rider'; id: string; name: string };
    } | null;
};

export type UpdateSessionMutationVariables = Exact<{
    id: Scalars['ID']['input'];
    horseId: InputMaybe<Scalars['ID']['input']>;
    riderId: InputMaybe<Scalars['ID']['input']>;
    date: InputMaybe<Scalars['DateTime']['input']>;
    durationMinutes: InputMaybe<Scalars['Int']['input']>;
    workType: InputMaybe<WorkType>;
    intensity: InputMaybe<Intensity>;
    rating: InputMaybe<Scalars['Int']['input']>;
    notes: InputMaybe<Scalars['String']['input']>;
}>;

export type UpdateSessionMutation = {
    __typename?: 'Mutation';
    updateSession: { __typename?: 'Session'; id: string };
};

export type DeleteSessionMutationVariables = Exact<{
    id: Scalars['ID']['input'];
}>;

export type DeleteSessionMutation = {
    __typename?: 'Mutation';
    deleteSession: boolean;
};

export type GetSessionsQueryVariables = Exact<{
    limit: InputMaybe<Scalars['Int']['input']>;
    offset: InputMaybe<Scalars['Int']['input']>;
    horseId: InputMaybe<Scalars['ID']['input']>;
    workType: InputMaybe<WorkType>;
    dateFrom: InputMaybe<Scalars['DateTime']['input']>;
    dateTo: InputMaybe<Scalars['DateTime']['input']>;
}>;

export type GetSessionsQuery = {
    __typename?: 'Query';
    sessions: Array<{
        __typename?: 'Session';
        id: string;
        date: any;
        durationMinutes: number;
        workType: WorkType;
        intensity: Intensity | null;
        notes: string;
        horse: { __typename?: 'Horse'; id: string; name: string };
        rider: { __typename?: 'Rider'; name: string };
    }>;
};

export type SignupMutationVariables = Exact<{
    name: Scalars['String']['input'];
    email: Scalars['String']['input'];
    password: Scalars['String']['input'];
    inviteCode: Scalars['String']['input'];
}>;

export type SignupMutation = {
    __typename?: 'Mutation';
    signup: { __typename?: 'AuthPayload'; token: string };
};
