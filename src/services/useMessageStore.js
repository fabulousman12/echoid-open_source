// src/services/useMessageStore.js
import { create } from 'zustand';

const useMessageStore = create((set) => ({
  messagestest: [],
  setMessagestest: (messages) => set({ messages }),
  addMessageTest: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  clearMessages: () => set({ messages: [] }),
}));

export default useMessageStore;
