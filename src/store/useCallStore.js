import { create } from "zustand";

export const useCallStore = create((set) => ({

    floating: { active:false, data:null },

    // called when minimizing call
    setFloating: (payload) => set({
        floating: {
            active: true,
            ...payload
        }
    }),

    // restore fullscreen
    clearFloating: () => set({
        floating: { active:false, data:null }
    })

}));
