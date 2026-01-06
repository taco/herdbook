import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/context/AuthContext';

export default function Logout() {
    const { logout } = useAuth();
    const navigate = useNavigate();

    console.log('Logout page');

    useEffect(() => {
        console.log('Logout page useEffect');
        logout();
        navigate('/login');
    }, []);

    return null;
}
