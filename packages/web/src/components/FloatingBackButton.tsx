import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface FloatingBackButtonProps {
    onBack?: () => void;
}

export function FloatingBackButton({
    onBack,
}: FloatingBackButtonProps): React.ReactNode {
    const navigate = useNavigate();

    return (
        <button
            onClick={onBack ?? (() => navigate(-1))}
            className="fixed top-4 left-4 z-30 flex items-center justify-center w-11 h-11 rounded-full bg-background/80 backdrop-blur-sm shadow-md border"
            aria-label="Go back"
        >
            <ArrowLeft className="h-5 w-5" />
        </button>
    );
}
