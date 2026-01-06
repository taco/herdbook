import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gql, CombinedGraphQLErrors } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';

const LOGIN_MUTATION = gql`
    mutation Login($email: String!, $password: String!) {
        login(email: $email, password: $password) {
            token
            rider {
                id
                name
            }
        }
    }
`;

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [formError, setFormError] = useState('');
    const [loginMutation] = useMutation(LOGIN_MUTATION);
    const navigate = useNavigate();
    const { login } = useAuth();

    useEffect(() => {
        setEmail('travis@example.com');
        setPassword('travis');
    });
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        try {
            const result = await loginMutation({
                variables: { email, password },
            });

            const {
                data: {
                    login: {
                        token,
                        rider: { id, name },
                    },
                },
            } = result as {
                data: {
                    login: {
                        token: string;
                        rider: { id: string; name: string };
                    };
                };
            };
            login(token, id, name);
            navigate('/');
        } catch (err) {
            if (CombinedGraphQLErrors.is(err)) {
                const errorCode = err.errors[0].extensions?.code;
                if (errorCode === 'INVALID_CREDENTIALS') {
                    setFormError('Invalid email or password');
                } else {
                    setFormError(err.errors[0].message);
                }
            }
        }
    };
    return (
        <div className="min-h-dvh flex items-start justify-center p-4 bg-background">
            <Card className="w-full max-w-md mt-10">
                <CardHeader>
                    <CardTitle>Login</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit}>
                        <div>
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <div>
                            {formError && (
                                <p className="text-red-500">{formError}</p>
                            )}
                        </div>
                        <Button type="submit">Login</Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
