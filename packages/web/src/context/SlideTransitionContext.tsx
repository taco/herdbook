import { createContext, useContext } from 'react';

interface SlideTransitionContextValue {
    triggerExit: () => void;
}

export const SlideTransitionContext =
    createContext<SlideTransitionContextValue>({
        triggerExit: () => {},
    });

export function useSlideTransition(): SlideTransitionContextValue {
    return useContext(SlideTransitionContext);
}
