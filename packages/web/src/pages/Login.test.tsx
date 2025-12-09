import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Login from './Login';
import { MockedProvider } from '@apollo/client/testing/react';
import { AuthProvider } from '../context/AuthContext';

// We'll test the Login page directly to avoid complex Router mocking issues in a simple setup
describe('Login Page', () => {
    it('renders login form', () => {
        render(
            <MockedProvider mocks={[]}>
                <AuthProvider>
                    <MemoryRouter>
                        <Routes>
                            <Route path="/" element={<Login />} />
                        </Routes>
                    </MemoryRouter>
                </AuthProvider>
            </MockedProvider>
        );

        expect(
            screen.getByRole('heading', { name: /Login/i })
        ).toBeInTheDocument();
        expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /Login/i })
        ).toBeInTheDocument();
    });
});
