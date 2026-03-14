// store/useUserStore.js
import { create } from 'zustand'

const useUserStore = create((set) => ({
  usersMaintest: [],
  setUsersMaintest: (users) => set({ usersMaintest: users }),
  addUserToMaintest: (user) =>
    set((state) => ({ usersMain: [...state.usersMain, user] })),
  removeUserFromMain: (userId) =>
    set((state) => ({
      usersMain: state.usersMain.filter((user) => user.id !== userId),
    })),
}))

export default useUserStore