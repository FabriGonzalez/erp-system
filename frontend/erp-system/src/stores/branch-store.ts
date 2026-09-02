import { create } from 'zustand';

import { Branch } from '@/types/auth';

type BranchState = {
    activeBranch: Branch | null;

    setActiveBranch: (branch: Branch) => void;

    clearActiveBranch: () => void;
};

export const useBranchStore = create<BranchState>((set) => ({
    activeBranch: null,

    setActiveBranch: (branch) => {
        set({
            activeBranch: branch,
        });
    },

    clearActiveBranch: () => {
        set({
            activeBranch: null,
        });
    },
}));