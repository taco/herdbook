export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: any; output: any; }
};

export type AuthPayload = {
  __typename?: 'AuthPayload';
  rider: Rider;
  token: Scalars['String']['output'];
};

export type Horse = {
  __typename?: 'Horse';
  activity: Array<WeeklyActivity>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  notes: Maybe<Scalars['String']['output']>;
  sessions: Array<Session>;
  updatedAt: Scalars['DateTime']['output'];
};


export type HorseActivityArgs = {
  weeks: InputMaybe<Scalars['Int']['input']>;
};

export type Mutation = {
  __typename?: 'Mutation';
  createHorse: Horse;
  createSession: Session;
  login: AuthPayload;
  signup: AuthPayload;
};


export type MutationCreateHorseArgs = {
  name: Scalars['String']['input'];
  notes: InputMaybe<Scalars['String']['input']>;
};


export type MutationCreateSessionArgs = {
  date: Scalars['DateTime']['input'];
  durationMinutes: Scalars['Int']['input'];
  horseId: Scalars['ID']['input'];
  notes: Scalars['String']['input'];
  workType: WorkType;
};


export type MutationLoginArgs = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};


export type MutationSignupArgs = {
  email: Scalars['String']['input'];
  name: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type Query = {
  __typename?: 'Query';
  horse: Maybe<Horse>;
  horses: Array<Horse>;
  lastSessionForHorse: Maybe<Session>;
  riders: Array<Rider>;
  sessions: Array<Session>;
};


export type QueryHorseArgs = {
  id: Scalars['ID']['input'];
};


export type QueryLastSessionForHorseArgs = {
  horseId: Scalars['ID']['input'];
};


export type QuerySessionsArgs = {
  limit: InputMaybe<Scalars['Int']['input']>;
  offset: InputMaybe<Scalars['Int']['input']>;
};

export type Rider = {
  __typename?: 'Rider';
  createdAt: Scalars['DateTime']['output'];
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  sessions: Array<Session>;
};

export type Session = {
  __typename?: 'Session';
  createdAt: Scalars['DateTime']['output'];
  date: Scalars['DateTime']['output'];
  durationMinutes: Scalars['Int']['output'];
  horse: Horse;
  id: Scalars['ID']['output'];
  notes: Scalars['String']['output'];
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
  Trail = 'TRAIL'
}

export type GetHorsesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetHorsesQuery = { __typename?: 'Query', horses: Array<{ __typename?: 'Horse', id: string, name: string }> };

export type GetRidersQueryVariables = Exact<{ [key: string]: never; }>;


export type GetRidersQuery = { __typename?: 'Query', riders: Array<{ __typename?: 'Rider', id: string, name: string }> };

export type CreateSessionMutationVariables = Exact<{
  horseId: Scalars['ID']['input'];
  date: Scalars['DateTime']['input'];
  durationMinutes: Scalars['Int']['input'];
  workType: WorkType;
  notes: Scalars['String']['input'];
}>;


export type CreateSessionMutation = { __typename?: 'Mutation', createSession: { __typename?: 'Session', id: string } };

export type GetDashboardDataQueryVariables = Exact<{ [key: string]: never; }>;


export type GetDashboardDataQuery = { __typename?: 'Query', horses: Array<{ __typename?: 'Horse', id: string, name: string, activity: Array<{ __typename?: 'WeeklyActivity', weekStart: any, count: number }> }>, sessions: Array<{ __typename?: 'Session', id: string, date: any, durationMinutes: number, workType: WorkType, notes: string, horse: { __typename?: 'Horse', name: string }, rider: { __typename?: 'Rider', name: string } }> };

export type LoginMutationVariables = Exact<{
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
}>;


export type LoginMutation = { __typename?: 'Mutation', login: { __typename?: 'AuthPayload', token: string, rider: { __typename?: 'Rider', id: string, name: string } } };

export type SignupMutationVariables = Exact<{
  name: Scalars['String']['input'];
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
}>;


export type SignupMutation = { __typename?: 'Mutation', signup: { __typename?: 'AuthPayload', token: string, rider: { __typename?: 'Rider', id: string, name: string } } };
