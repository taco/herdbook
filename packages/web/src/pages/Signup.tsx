import React, { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { useNavigate, Link } from 'react-router-dom';
// import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardFooter,
} from '@/components/ui/card';

const SIGNUP_MUTATION = gql`
    mutation Signup($name: String!, $email: String!, $password: String!) {
        signup(name: $name, email: $email, password: $password) {
            token
            rider {
                id
                name
                email
            }
        }
    }
`;

export default function Signup() {
    return (
        <div>
            <h1>Signup</h1>
        </div>
    );
    // const [name, setName] = useState('');
    // const [email, setEmail] = useState('');
    // const [password, setPassword] = useState('');
    // const [error, setError] = useState('');
    // const navigate = useNavigate();
    // const { login } = useAuth();
    // const [signupMutation, { loading }] = useMutation<any>(SIGNUP_MUTATION);

    // const handleSubmit = async (e: React.FormEvent) => {
    //     e.preventDefault();
    //     setError('');
    //     try {
    //         const { data } = await signupMutation({
    //             variables: { name, email, password },
    //         });
    //         login(data.signup.token, data.signup.rider);
    //         navigate('/');
    //     } catch (err: any) {
    //         setError(err.message || 'An error occurred during signup');
    //     }
    // };

    // return (
    //     <div className="flex items-center justify-center min-h-screen bg-gray-100">
    //         <Card className="w-[350px]">
    //             <CardHeader>
    //                 <CardTitle>Sign Up</CardTitle>
    //             </CardHeader>
    //             <CardContent>
    //                 <form onSubmit={handleSubmit}>
    //                     <div className="grid w-full items-center gap-4">
    //                         <div className="flex flex-col space-y-1.5">
    //                             <Label htmlFor="name">Name</Label>
    //                             <Input
    //                                 id="name"
    //                                 placeholder="Enter your name"
    //                                 value={name}
    //                                 onChange={(e) => setName(e.target.value)}
    //                                 required
    //                             />
    //                         </div>
    //                         <div className="flex flex-col space-y-1.5">
    //                             <Label htmlFor="email">Email</Label>
    //                             <Input
    //                                 id="email"
    //                                 type="email"
    //                                 placeholder="Enter your email"
    //                                 value={email}
    //                                 onChange={(e) => setEmail(e.target.value)}
    //                                 required
    //                             />
    //                         </div>
    //                         <div className="flex flex-col space-y-1.5">
    //                             <Label htmlFor="password">Password</Label>
    //                             <Input
    //                                 id="password"
    //                                 type="password"
    //                                 placeholder="Choose a password"
    //                                 value={password}
    //                                 onChange={(e) =>
    //                                     setPassword(e.target.value)
    //                                 }
    //                                 required
    //                             />
    //                         </div>
    //                     </div>
    //                     {error && (
    //                         <p className="text-red-500 text-sm mt-2">{error}</p>
    //                     )}
    //                     <Button
    //                         className="w-full mt-6"
    //                         type="submit"
    //                         disabled={loading}
    //                     >
    //                         {loading ? 'Signing up...' : 'Sign Up'}
    //                     </Button>
    //                 </form>
    //             </CardContent>
    //             <CardFooter className="flex justify-center">
    //                 <p className="text-sm text-gray-500">
    //                     Already have an account?{' '}
    //                     <Link
    //                         to="/login"
    //                         className="text-blue-500 hover:underline"
    //                     >
    //                         Login
    //                     </Link>
    //                 </p>
    //             </CardFooter>
    //         </Card>
    //     </div>
    // );
}
