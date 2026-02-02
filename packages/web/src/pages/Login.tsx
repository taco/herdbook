import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gql, CombinedGraphQLErrors } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { LoginMutation, LoginMutationVariables } from '@/generated/graphql';

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

// Dev convenience: prefill credentials from env vars (set in .env.local, not committed)
const DEV_EMAIL = import.meta.env.VITE_DEV_EMAIL || '';
const DEV_PASSWORD = import.meta.env.VITE_DEV_PASSWORD || '';
const DEV_AUTOLOGIN = import.meta.env.VITE_DEV_AUTOLOGIN === 'true';

export default function Login() {
    const [email, setEmail] = useState(DEV_EMAIL);
    const [password, setPassword] = useState(DEV_PASSWORD);
    const [formError, setFormError] = useState('');
    const [loginMutation] = useMutation<LoginMutation, LoginMutationVariables>(LOGIN_MUTATION);
    const navigate = useNavigate();
    const { login } = useAuth();
    const autoLoginAttempted = useRef(false);

    // Auto-login in dev mode if credentials are set and VITE_DEV_AUTOLOGIN=true
    useEffect(() => {
        if (
            import.meta.env.DEV &&
            DEV_AUTOLOGIN &&
            DEV_EMAIL &&
            DEV_PASSWORD &&
            !autoLoginAttempted.current
        ) {
            autoLoginAttempted.current = true;
            loginMutation({ variables: { email: DEV_EMAIL, password: DEV_PASSWORD } })
                .then((result) => {
                    if (result.data) {
                        const { token, rider } = result.data.login;
                        login(token, rider.id, rider.name);
                        navigate('/');
                    }
                })
                .catch(() => {
                    // Auto-login failed, user can manually log in
                });
        }
    }, [loginMutation, login, navigate]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        try {
            const result = await loginMutation({
                variables: { email, password },
            });

            if (result.data) {
                const { token, rider } = result.data.login;
                login(token, rider.id, rider.name);
                navigate('/');
            }
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
