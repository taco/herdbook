import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CombinedGraphQLErrors, gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';

import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SignupMutation, SignupMutationVariables } from '@/generated/graphql';

const SIGNUP_MUTATION = gql`
    mutation Signup($name: String!, $email: String!, $password: String!) {
        signup(name: $name, email: $email, password: $password) {
            token
            rider {
                id
                name
            }
        }
    }
`;

export default function Signup() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [formError, setFormError] = useState('');
    const [signupMutation] = useMutation<SignupMutation, SignupMutationVariables>(SIGNUP_MUTATION);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        try {
            const result = await signupMutation({
                variables: { name, email, password },
            });

            if (result.data) {
                const { token, rider } = result.data.signup;
                login(token, rider.id, rider.name);
                navigate('/');
            }
        } catch (err) {
            if (CombinedGraphQLErrors.is(err)) {
                setFormError(err.errors[0].message);
            }
        }
    };

    return (
        <div className="min-h-dvh flex items-start justify-center p-4 bg-background">
            <Card className="w-full max-w-md mt-10">
                <CardHeader>
                    <CardTitle>Signup</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit}>
                        <div>
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
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
                        <Button type="submit">Signup</Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
