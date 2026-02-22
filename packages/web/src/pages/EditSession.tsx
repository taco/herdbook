import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';

import SessionEditor from '@/components/session/SessionEditor';
import type { SessionValues } from '@/components/session/SessionEditor';
import { useAppNavigate } from '@/hooks/useAppNavigate';
import { useAuth } from '@/context/AuthContext';
import { formatAsDateTimeLocalValue } from '@/lib/dateUtils';
import { GET_HORSES_QUERY, GET_RIDERS_QUERY } from '@/lib/queries';
import {
    WorkType,
    CreateSessionMutation,
    CreateSessionMutationVariables,
    GetHorsesQuery,
    GetHorsesQueryVariables,
    GetRidersQuery,
    GetRidersQueryVariables,
} from '@/generated/graphql';

interface PrefillData {
    horseId?: string | null;
    riderId?: string | null;
    date?: string | null;
    durationMinutes?: number | null;
    workType?: WorkType | null;
    notes?: string | null;
}

interface LocationState {
    prefill?: PrefillData;
}

const CREATE_SESSION_MUTATION = gql`
    mutation CreateSession(
        $horseId: ID!
        $riderId: ID
        $date: DateTime!
        $durationMinutes: Int!
        $workType: WorkType!
        $notes: String!
    ) {
        createSession(
            horseId: $horseId
            riderId: $riderId
            date: $date
            durationMinutes: $durationMinutes
            workType: $workType
            notes: $notes
        ) {
            id
        }
    }
`;

export default function EditSession(): React.ReactNode {
    const location = useLocation();
    const { back, backTo } = useAppNavigate();
    const { riderId: currentRiderId, isTrainer } = useAuth();
    const locationState = location.state as LocationState | null;
    const prefill = locationState?.prefill;

    const { data: horsesData } = useQuery<
        GetHorsesQuery,
        GetHorsesQueryVariables
    >(GET_HORSES_QUERY);

    const { data: ridersData } = useQuery<
        GetRidersQuery,
        GetRidersQueryVariables
    >(GET_RIDERS_QUERY, { skip: !isTrainer });

    const horses = horsesData?.horses ?? [];
    const riders = ridersData?.riders ?? [];

    const [createSession, { loading: saving }] = useMutation<
        CreateSessionMutation,
        CreateSessionMutationVariables
    >(CREATE_SESSION_MUTATION);

    // Build initial values from prefill → localStorage → defaults
    const initialValues = useMemo((): SessionValues => {
        const persisted = JSON.parse(
            localStorage.getItem('createSession') || '{}'
        );

        return {
            horseId: prefill?.horseId ?? persisted.horseId ?? null,
            riderId: prefill?.riderId ?? currentRiderId ?? null,
            dateTime: prefill?.date ?? formatAsDateTimeLocalValue(new Date()),
            durationMinutes:
                prefill?.durationMinutes ?? persisted.durationMinutes ?? null,
            workType: prefill?.workType ?? persisted.workType ?? null,
            notes: prefill?.notes ?? '',
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSave = async (values: SessionValues): Promise<void> => {
        const persistedVariables = {
            horseId: values.horseId,
            durationMinutes: values.durationMinutes,
            workType: values.workType,
        };

        await createSession({
            variables: {
                horseId: values.horseId!,
                riderId: isTrainer && values.riderId ? values.riderId : null,
                date: new Date(values.dateTime).toISOString(),
                durationMinutes: values.durationMinutes!,
                workType: values.workType!,
                notes: values.notes.trim(),
            },
            update(cache) {
                cache.evict({ fieldName: 'sessions' });
                cache.evict({ fieldName: 'lastSessionForHorse' });
                cache.gc();
            },
        });

        localStorage.setItem(
            'createSession',
            JSON.stringify(persistedVariables)
        );

        backTo('/');
    };

    return (
        <SessionEditor
            initialValues={initialValues}
            horses={horses}
            riders={riders}
            onSave={handleSave}
            onBack={back}
            title="Log Session"
            saving={saving}
            showRiderPicker={isTrainer}
        />
    );
}
