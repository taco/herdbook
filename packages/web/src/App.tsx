import { useQuery, gql } from '@apollo/client';

const HELLO_QUERY = gql`
    query Hello {
        hello
    }
`;

function App() {
    const { loading, error, data } = useQuery(HELLO_QUERY);

    if (loading) return <p>Loading...</p>;
    if (error) return <p>Error: {error.message}</p>;

    return (
        <div>
            <h1>Herdbook</h1>
            <p>{data?.hello}</p>
        </div>
    );
}

export default App;
