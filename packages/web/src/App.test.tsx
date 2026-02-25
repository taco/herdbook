import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from './App';
import { MockedProvider } from '@apollo/client/testing/react';

// Mock the AuthContext to simulate a logged-out state initially
vi.mock('./context/AuthContext', async () => {
    const actual = await vi.importActual('./context/AuthContext');
    return {
        ...actual,
        useAuth: () => ({
            isAuthenticated: false,
            login: vi.fn(),
            logout: vi.fn(),
            syncIdentity: vi.fn(),
            riderId: null,
            riderName: null,
            riderRole: null,
            isTrainer: false,
            token: null,
        }),
    };
});

describe('App', () => {
    it('renders login page by default when not authenticated', () => {
        render(
            <MockedProvider mocks={[]}>
                <App />
            </MockedProvider>
        );

        expect(
            screen.getByRole('heading', { name: /Login/i })
        ).toBeInTheDocument();
    });
});
