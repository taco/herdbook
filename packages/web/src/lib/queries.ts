import { gql } from '@apollo/client';

export const GET_HORSES_QUERY = gql`
    query GetHorses {
        horses {
            id
            name
        }
    }
`;

export const GET_RIDERS_QUERY = gql`
    query GetRiders {
        riders {
            id
            name
        }
    }
`;
