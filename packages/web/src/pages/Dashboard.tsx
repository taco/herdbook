import { useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const DASHBOARD_QUERY = gql`
    query GetDashboardData {
        horses {
            id
            name
        }
        sessions {
            id
            date
            durationMinutes
            workType
            horse {
                name
            }
        }
    }
`;

export default function Dashboard() {
    return (
        <div>
            <h1>Dashboard</h1>
        </div>
    );
}
