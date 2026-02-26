import { useState } from 'react';
import { gql } from '@apollo/client';
import { useQuery, useMutation } from '@apollo/client/react';
import { Copy, Check, ArrowUpFromLine, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import SummaryRow from '@/components/session/SummaryRow';
import BarnNameEditSheet from '@/components/BarnNameEditSheet';
import { useAuth } from '@/context/AuthContext';
import { getUserErrorMessage } from '@/lib/utils';
import type {
    GetBarnQuery,
    UpdateBarnMutation,
    UpdateBarnMutationVariables,
    RegenerateInviteCodeMutation,
} from '@/generated/graphql';

const GET_BARN = gql`
    query GetBarn {
        barn {
            id
            name
            inviteCode
            riders {
                id
            }
        }
    }
`;

const UPDATE_BARN = gql`
    mutation UpdateBarn($name: String!) {
        updateBarn(name: $name) {
            id
            name
        }
    }
`;

const REGENERATE_INVITE_CODE = gql`
    mutation RegenerateInviteCode {
        regenerateInviteCode {
            id
            inviteCode
        }
    }
`;

export default function BarnSection(): React.ReactNode {
    const { isTrainer } = useAuth();
    const [editOpen, setEditOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const { data, loading, error } = useQuery<GetBarnQuery>(GET_BARN);

    const [updateBarn, { loading: updating }] = useMutation<
        UpdateBarnMutation,
        UpdateBarnMutationVariables
    >(UPDATE_BARN);

    const [regenerateInviteCode, { loading: regenerating }] =
        useMutation<RegenerateInviteCodeMutation>(REGENERATE_INVITE_CODE);

    const handleSaveName = async (name: string): Promise<void> => {
        setFormError(null);
        try {
            await updateBarn({
                variables: { name },
                update(cache) {
                    cache.evict({ fieldName: 'barn' });
                    cache.gc();
                },
            });
            setEditOpen(false);
        } catch (err) {
            setFormError(getUserErrorMessage(err));
        }
    };

    const handleRegenerate = async (): Promise<void> => {
        setFormError(null);
        try {
            await regenerateInviteCode({
                update(cache) {
                    cache.evict({ fieldName: 'barn' });
                    cache.gc();
                },
            });
        } catch (err) {
            setFormError(getUserErrorMessage(err));
        }
    };

    const handleCopy = async (code: string): Promise<void> => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Silently degrade — clipboard may not be available
        }
    };

    const handleShare = async (code: string): Promise<void> => {
        const shareData = {
            title: 'Join my barn',
            text: `Use this invite code to join my barn: ${code}`,
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await handleCopy(code);
            }
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') return;
            await handleCopy(code);
        }
    };

    if (loading) {
        return (
            <section>
                <h2 className="text-sm font-medium text-muted-foreground mb-2 px-1">
                    Barn
                </h2>
                <div className="space-y-3">
                    <Skeleton className="h-10 w-full rounded-lg" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                </div>
            </section>
        );
    }

    if (error || !data) {
        return (
            <section>
                <h2 className="text-sm font-medium text-muted-foreground mb-2 px-1">
                    Barn
                </h2>
                <p className="text-sm text-muted-foreground">
                    Unable to load barn information
                </p>
            </section>
        );
    }

    const barn = data.barn;
    const memberCount = barn.riders.length;

    if (isTrainer) {
        return (
            <section>
                <h2 className="text-sm font-medium text-muted-foreground mb-2 px-1">
                    Barn
                </h2>

                <SummaryRow
                    label="Name"
                    value={barn.name}
                    onClick={() => {
                        setFormError(null);
                        setEditOpen(true);
                    }}
                />

                <div className="flex items-center justify-between py-3 px-1 border-b border-border min-h-[52px]">
                    <span className="text-base text-muted-foreground">
                        Members
                    </span>
                    <span className="text-base text-foreground">
                        {memberCount}
                    </span>
                </div>

                {barn.inviteCode && (
                    <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2">
                            <code className="flex-1 rounded-lg bg-muted/50 px-3 py-2 font-mono text-base">
                                {barn.inviteCode}
                            </code>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleCopy(barn.inviteCode!)}
                                aria-label="Copy invite code"
                            >
                                {copied ? (
                                    <Check className="h-4 w-4" />
                                ) : (
                                    <Copy className="h-4 w-4" />
                                )}
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleShare(barn.inviteCode!)}
                                aria-label="Share invite code"
                            >
                                <ArrowUpFromLine className="h-4 w-4" />
                            </Button>
                        </div>

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="w-full"
                                    disabled={regenerating}
                                >
                                    <RefreshCw
                                        className={`mr-2 h-4 w-4 ${regenerating ? 'animate-spin' : ''}`}
                                    />
                                    Regenerate Invite Code
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>
                                        Regenerate invite code?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        The current invite code will stop
                                        working. Anyone who hasn&apos;t signed
                                        up yet will need the new code.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>
                                        Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleRegenerate}
                                    >
                                        Regenerate
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                        {formError && (
                            <p className="text-sm text-red-500 mt-2">
                                {formError}
                            </p>
                        )}
                    </div>
                )}

                <BarnNameEditSheet
                    open={editOpen}
                    onOpenChange={(open) => {
                        setEditOpen(open);
                        setFormError(null);
                    }}
                    currentName={barn.name}
                    onSave={handleSaveName}
                    saving={updating}
                    error={formError}
                />
            </section>
        );
    }

    // Rider view — read-only
    return (
        <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-2 px-1">
                Barn
            </h2>
            <div className="flex items-center justify-between py-3 px-1 border-b border-border min-h-[52px]">
                <span className="text-base text-muted-foreground">Name</span>
                <span className="text-base text-foreground">{barn.name}</span>
            </div>
            <div className="flex items-center justify-between py-3 px-1 border-b border-border min-h-[52px]">
                <span className="text-base text-muted-foreground">Members</span>
                <span className="text-base text-foreground">{memberCount}</span>
            </div>
        </section>
    );
}
