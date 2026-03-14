import React, { useState, createContext, useEffect, useCallback } from "react";
import { api } from "../services/api";

const MessageContext = createContext();

const MessageProvider = (props) => {
  const [currentUserId, setCurrentUser] = useState(null);
  const [selectedUser, setSelectedUser1] = useState(null);
  const [usersMain, setUsersMain] = useState([]);
  const [activeFooter, setActiveFooter] = useState('Chats');
  const [calls, setCalls] = useState([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [isLoad, setIsLoad] = useState(true);

  // Fetch users from storage or API
  const fetchUsers = useCallback(async (host) => {
    try {
      const response = await api.allUsers(host, []);
      if (response.ok) {
        const { userDetails } = await response.json();
        const updatedUsers = userDetails.map((user) => ({
          id: user.id,
          name: user.name,
          avatar: user.profilePic || "default-avatar-url",
          lastMessage: usersMain.find((u) => u.id === user.id)?.lastMessage || "No messages yet",
          timestamp: usersMain.find((u) => u.id === user.id)?.timestamp || "",
          unreadCount: usersMain.find((u) => u.id === user.id)?.unreadCount || 0,
        }));
        setUsersMain(updatedUsers);
        globalThis.storage?.setItem("usersMain", JSON.stringify(updatedUsers));
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }, []);

  // Fetch messages from storage
  const getMessages = async () => {
    try {
      const value = await globalThis.storage?.getItemAsync?.("messages");
      return value ? JSON.parse(value) : [];
    } catch (error) {
      console.error("Error retrieving messages:", error);
      return [];
    }
  };

  // Save a single message
  const saveMessage = async (message) => {
    try {
      const storedMessages = await getMessages();
      const updatedMessages = [...storedMessages, message];
      globalThis.storage?.setItem("messages", JSON.stringify(updatedMessages));
      setMessages(updatedMessages);
    } catch (error) {
      console.error("Error saving message:", error);
    }
  };

  // Update unread count for a user
  const updateUnreadCount = async (senderId) => {
    try {
      const updatedUnreadCount = {
        ...unreadcount,
        [senderId]: (unreadcount[senderId] || 0) + 1,
      };
      globalThis.storage?.setItem("unreadCount", JSON.stringify(updatedUnreadCount));
      setUnreadcount(updatedUnreadCount);
    } catch (error) {
      console.error("Error updating unread count:", error);
    }
  };

  // Mark messages as read for a user
  const markMessagesAsRead = async (senderId) => {
    try {
      const updatedUnreadCount = {
        ...unreadcount,
        [senderId]: 0,
      };
      globalThis.storage?.setItem("unreadCount", JSON.stringify(updatedUnreadCount));
      setUnreadcount(updatedUnreadCount);
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  // Fetch users from local storage
  const loadUsersFromLocalStorage = async () => {
    const value = await globalThis.storage?.getItemAsync?.("usersMain");
    if (value) {
      setUsersMain(JSON.parse(value));
    }
  };

  // Initialization
  useEffect(() => {
    try {
      const storedCalls = globalThis.storage?.readJSON?.("calls", []) || [];
      setCalls(Array.isArray(storedCalls) ? storedCalls : []);
    } catch (error) {
      console.error("Error loading calls from storage:", error);
      setCalls([]);
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      try {
        const storedCalls = globalThis.storage?.readJSON?.("calls", []) || [];
        setCalls(Array.isArray(storedCalls) ? storedCalls : []);
      } catch (error) {
        console.error("Error refreshing calls from storage:", error);
      }
    };
    window.addEventListener("calls-updated", handler);
    return () => window.removeEventListener("calls-updated", handler);
  }, []);

  return (
    <MessageContext.Provider
      value={{
       currentUserId,
       setCurrentUser,
       selectedUser,
       setSelectedUser1,
       usersMain,
       setUsersMain,
       activeFooter,
       setActiveFooter,
       calls,
       setCalls,
       menuVisible,
       setMenuVisible,
       showAlert,
       setShowAlert,
       alertMessage,
       setAlertMessage,
       isLoad,
       setIsLoad,
       fetchUsers,
       getMessages,
       saveMessage,
       updateUnreadCount,
       markMessagesAsRead
      }}
    >
      {props.children}
    </MessageContext.Provider>
  );
};

export { MessageContext, MessageProvider };
