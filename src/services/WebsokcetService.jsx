import { isPlatform } from '@ionic/react';
import {  CapacitorSQLite,SQLiteDBConnection } from '@capacitor-community/sqlite';
import React, {  useState ,useRef, useEffect} from 'react';

import Maindata from '../data';
// Initialize SQLite Database


// WebSocket Service

const WebSocketService = () => {
  const socket = useRef(null);
  const host = `https://${Maindata.SERVER_URL}`;
  const [initialMessageUserIds, setInitialMessageUserIds] = useState(new Set());
  const [unreadCounts, setUnreadCounts] = useState({});
  const [messages, setMessages] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [latestMessageTimestamps, setLatestMessageTimestamps] = useState(new Map());
  const [currentUser, setCurrenuser] = useState({});
  let db; // Ref to store the database connection

  // Initialize SQLite DB
  const initSQLiteDB = async () => {
    try {
      const dbName = 'Conversa_chats_store.db';
      if (!db) {
        return new Promise((resolve, reject) => {
          db = window.sqlitePlugin.openDatabase({ name: dbName, location: 'default' });
          db.transaction(tx => {
            tx.executeSql(`
              CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                sender TEXT,
                recipient TEXT,
                content TEXT,
                timestamp TEXT,
                status TEXT,
                read INTEGER DEFAULT 0
              );
            `, [], () => resolve(), (tx, error) => reject(error));

            tx.executeSql(`
              CREATE TABLE IF NOT EXISTS unreadCount (
                sender TEXT PRIMARY KEY,
                count INTEGER DEFAULT 0
              );
            `, [], () => resolve(), (tx, error) => reject(error));
          });
        });
      }
    } catch (err) {
      console.error('SQLite DB Error:', err);
    }
  };

  // Connect to WebSocket
  const connect = async (url) => {
    console.log('Attempting to connect to WebSocket', url);

    if (!socket.current || socket.current.readyState === WebSocket.CLOSED) {
       socket.current = new WebSocket(url);
    
      
      socket.current.addEventListener('open', () => {
        console.log('WebSocket connected');
        console.log(socket.current)
        initialize();
        startHeartbeat(socket.current);
      });

      socket.current.addEventListener('message', async (event) => {
        try {
          const data = JSON.parse(event.data);
          await handleMessage(data);
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      });

      socket.current.addEventListener('error', (error) => {
        console.error('WebSocket error:', error);
      });

      socket.current.addEventListener('close', (event) => {
        console.log('WebSocket closed:', event.reason);
        reconnect(url);
      });
    }
 
  };

 

  // Send heartbeat to keep connection alive
  function startHeartbeat(socket) {
    setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'ping' }));
        console.log("Ping sent");
      }
    }, 30000); // Send a ping every 30 seconds
  }

  // Handle messages received via WebSocket
  const handleMessage = async (data) => {
    try {
      if (isPlatform('hybrid')) {
        if (!db) {
          await initSQLiteDB();
        }
        await handleSQLiteStorage(db, data);
      } else {
        await handleWebStorage(data);
      }
    } catch (err) {
      console.error("Error handling message:", err);
    }
  };

  // SQLite storage handling
  const handleSQLiteStorage = async (db, data) => {
    if (!db) {
      console.error('Database connection is not available.');
      return;
    }

    try {

      if(data.type === 'update'){

        if(data.updateType === 'unread'){
        
        console.log("Update message received: ", data);

        const { messageIds } = data;

        // Fetch messages from Cordova SQLite
        const query = `
            SELECT * FROM messages
            WHERE id IN (${messageIds.map(() => '?').join(',')})
        `;
        db.executeSql(query, messageIds, (resultSet) => {
            const updatedMessages = [];
            for (let i = 0; i < resultSet.rows.length; i++) {
                const message = resultSet.rows.item(i);
                updatedMessages.push({ ...message, read: 1 });
            }

            // Update the database to mark messages as read
            const updateQuery = `
                UPDATE messages
                SET read = 1
                WHERE id IN (${messageIds.map(() => '?').join(',')})
            `;
            db.executeSql(updateQuery, messageIds, () => {
                console.log("Messages updated in SQLite");

                // Update the state with the updated messages
                setMessages((prevMessages) =>
                    prevMessages.map((msg) =>
                        messageIds.includes(msg.id)
                            ? { ...msg, read: true }
                            : msg
                    )
                );

                // Optionally update unread counts (if applicable)
                setUnreadCounts((prev) => ({
                    ...prev,
                    [data.sender]: 0, // Assuming `sender` is part of the data payload
                }));
            });
        });
      }
    }

      if (data.type === 'initialMessages') {
        const savedMessages = await getALLMessagesFromSQLite(db);
        const filteredMessages = savedMessages.filter(msg => !msg.id.startsWith('temp-'));
        const newMessages = data.messages.filter(message => 
          !filteredMessages.some(savedMsg => savedMsg.id === message.id)
        );
        
        const finalMessages = [...filteredMessages, ...newMessages];

        // Save new messages in SQLite
        for (const message of newMessages) {
          await storeMessageInSQLite(db, message);
        }

        // Handle unread counts and user IDs
        const unreadCountsMap = new Map();
        const userIds = new Set();
        const latestMessageTimestampsMap = new Map();

        finalMessages.forEach(msg => {
          if (msg.read === 0 && msg.recipient === currentUser.id) {
            if (!unreadCountsMap.has(msg.sender)) {
              unreadCountsMap.set(msg.sender, 0);
            }
            unreadCountsMap.set(msg.sender, unreadCountsMap.get(msg.sender) + 1);
          }
          userIds.add(msg.sender);
          userIds.add(msg.recipient);
          latestMessageTimestampsMap.set(msg.sender, new Date(msg.timestamp).getTime());
          latestMessageTimestampsMap.set(msg.recipient, new Date(msg.timestamp).getTime());
        });
        setMessages(prevmess =>{
          return [...prevmess,...finalMessages]
        })
        // Update state
        setInitialMessageUserIds(userIds);
        setUnreadCounts(Object.fromEntries(unreadCountsMap));
        setLatestMessageTimestamps(latestMessageTimestampsMap);
      } else if (data.type === 'message') {
        const { id, content, sender, recipient, timestamp, status, read } = data;
        let updatedReadStatus = read;
        const storedUnreadCounts = globalThis.storage.readJSON('unreadCounts', {}) || {};

    
          if (sender === selectedUser) {
            updatedReadStatus = 1;
            const updatePayload = {
              type: 'update',
              updateType: 'unread',
              messageIds:id,
            };

            socket.send(
              JSON.stringify({
                updatePayload,
              })
            );
            storedUnreadCounts[sender] = 0;
          } else {
            updatedReadStatus = 0;
            storedUnreadCounts[sender] = (storedUnreadCounts[sender] || 0) + 1;
          }
        

        globalThis.storage.setItem('unreadCounts', JSON.stringify(storedUnreadCounts));
        setUnreadCounts(storedUnreadCounts);
        const updatedMessages = [
          ...globalThis.storage.readJSON('messages', []),
          { id: id, content, sender, recipient, status, timestamp, read: updatedReadStatus }
        ];
        
        setMessages(prevMessages => {
          if (!prevMessages.some(msg => msg.id === id)) {
            return [...prevMessages, { id: id, content, sender, recipient, status, timestamp, read: updatedReadStatus }];
          }
          return prevMessages;
        });

        // Save new message to SQLite
        await storeMessageInSQLite(db, updatedMessages);

        // Update latest message timestamps
        const latestMessageTimestampMap = new Map(latestMessageTimestamps);
        latestMessageTimestampMap.set(sender, new Date(timestamp).getTime());
        latestMessageTimestampMap.set(recipient, new Date(timestamp).getTime());
        setLatestMessageTimestamps(latestMessageTimestampMap);
      }
    } catch (error) {
      console.error('Error in SQLite message handling:', error);
    }
  };

  // WebStorage handling
  const handleWebStorage = async (event) => {
    

    try {
      const data = event;
    

      if (data.type === "update" && data.updateType === "unread") {
        console.log("Update message received:", data);
  
        const { messageIds } = data;
  
        // Fetch and update messages in localStorage
        const storedMessages = globalThis.storage.readJSON("messages", []);
        const updatedMessages = storedMessages.map((message) =>
          messageIds.includes(message.id) ? { ...message, read: 1 } : message
        );
  
        // Update localStorage and state
        globalThis.storage.setItem("messages", JSON.stringify(updatedMessages));
        console.log("Messages updated in localStorage:", updatedMessages);
  
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            messageIds.includes(msg.id) ? { ...msg, read: true } : msg
          )
        );
  
        // Optionally update unread counts
        setUnreadCounts((prev) => ({
          ...prev,
          [data.sender]: 0, // Assuming `sender` exists in the payload
        }));
      }
  

      if (data.type === 'initialMessages') {
        const { messages: initialMessages } = data;
        let savedMessages = globalThis.storage.readJSON('messages', []) || [];
        
        // Filter out any messages already saved to avoid duplicates
        // const newMessages = initialMessages.filter(message => 
        //   !savedMessages.some(savedMessage => savedMessage.id === message.id)
        // );
        const filteredMessages = savedMessages.filter(msg => !msg.id.startsWith('temp-'));
        const newMessages = initialMessages.filter(message => 
          !filteredMessages.some(savedMsg => savedMsg.id === message.id)
        );
        
        
        // Append new messages to the existing saved messages
        savedMessages.push(...newMessages);
        
        // Save the updated messages back to localStorage
        globalThis.storage.setItem('messages', JSON.stringify(savedMessages));
    
        setMessages(prevmess =>{
          return [...prevmess,...newMessages]
        })

        const unreadCountsMap = new Map();
        const userIds = new Set();
        const latestMessageTimestampsMap = new Map();

        newMessages.forEach(msg => {
          if (msg.read === 0 && msg.recipient === currentUser.id) {
            unreadCountsMap.set(msg.sender, (unreadCountsMap.get(msg.sender) || 0) + 1);
          }
          userIds.add(msg.sender);
          userIds.add(msg.recipient);
          latestMessageTimestampsMap.set(msg.sender, new Date(msg.timestamp).getTime());
          latestMessageTimestampsMap.set(msg.recipient, new Date(msg.timestamp).getTime());
        }); 

        setInitialMessageUserIds(userIds);
        setLatestMessageTimestamps(latestMessageTimestampsMap);
        const unreadCounts = Object.fromEntries(unreadCountsMap);
        globalThis.storage.setItem('unreadCounts', JSON.stringify(unreadCounts));
        setUnreadCounts(unreadCounts);
      } else if (data.type === 'message') {
        console.log("message received in single",data)

        const { id, content, sender, recipient, timestamp, status, read } = data;
        const storedUnreadCounts = globalThis.storage.readJSON('unreadCounts', {}) || {};
        let updatedReadStatus = read;

    console.log("selected user",selectedUser)
          if (sender === selectedUser) {
            updatedReadStatus = 1;
            // await fetch(`${host}/messages/mark-read`, {
            //   method: 'POST',
            //   headers: { 'Content-Type': 'application/json', 'Auth': token },
            //   body: JSON.stringify({ messageIds: id })
            // });
            const updatePayload = {
              type: 'update',
              updateType: 'unread',
              messageIds:id,
            };

            socket.send(
              JSON.stringify({
                updatePayload,
              })
            );
            storedUnreadCounts[sender] = 0;
          } else {
            updatedReadStatus = 0;
            storedUnreadCounts[sender] = (storedUnreadCounts[sender] || 0) + 1;
          }
        

        globalThis.storage.setItem('unreadCounts', JSON.stringify(storedUnreadCounts));
        setUnreadCounts(storedUnreadCounts);

        const updatedMessages = [
          ...globalThis.storage.readJSON('messages', []),
          { id: id, content, sender, recipient, status, timestamp, read: updatedReadStatus }
        ];
        console.log("lets see the fuck",messages)
    
        setMessages(prevMessages => {
          if (!prevMessages.some(msg => msg.id === id)) {
            return [...prevMessages, { id: id, content, sender, recipient, status, timestamp, read: updatedReadStatus }];
          }
          return prevMessages;
        });

        console.log("added to state",messages)

        globalThis.storage.setItem('messages', JSON.stringify(updatedMessages));
      }
    } catch (error) {
      console.error('Error in WebStorage message handling:', error);
    }
  };
  const selectUser = async (userId) => {
    setSelectedUser(userId)

    if (isPlatform('hybrid')) {
      await resetUnreadCountInSQLite(db, userId);

    } else {
      const unreadCounts = globalThis.storage.readJSON('unreadCounts', {}) || {};
      unreadCounts[userId] = 0;
      globalThis.storage.setItem('unreadCounts', JSON.stringify(unreadCounts));
    }
  }; 

  const sendMessage = (message) => {
    console.log(socket.current)
    if (socket.current && socket.current.readyState === WebSocket.OPEN) {
      try {
        socket.current.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending message:', error);
      }
    } else {
      console.error('WebSocket is not connected');
    }
  };

  const close = () => {
    if (socket.current) {
      try {
        socket.current.close();
      } catch (error) {
        console.error('Error closing WebSocket:', error);
      }
    }
  };

  const reconnect = (url) => {
    console.log('Attempting to reconnect...');
    setTimeout(() => {
      connect(url);
    }, 5000);
  };

const getmessages = async()=>{
  try {

    if(isPlatform('hybrid')){
      const initialMessages = await getMessagesFromSQLite(db, currentUser, 45);
      console.log(initialMessages)
      setMessages(initialMessages);
    }else{
      const initialMessages = globalThis.storage.readJSON('messages', []) || [];
      setMessages(initialMessages);
      console.log(initialMessages)
    }

    
  } catch (error) {er
    console.error("error in getting messagessgsgs",err)
  }
}

const saveMessage = async(message)=>{

  try {
    console.log(socket.current)
    if (socket.current ) {
      if (socket.current.readyState === WebSocket.OPEN) {
        try {
          socket.current.send(JSON.stringify(message));
          console.log("sent the message",message)
        } catch (error) {
          console.error('Error sending message:', error);
        }
      } else {
        console.log("WebSocket is not open yet.");
      }
     
    } else {
      console.error('WebSocket is not connected');
    }

    if(isPlatform('hybrid')){
      const mainMessages = {
        id: message.messageId,  // Ensure the correct field is mapped
        sender: message.sender,
        recipient: message.recipient,
        content: message.content,
        timestamp: message.timestamp,
        status: message.status,
        read: message.read,
        isReplyTo: message.isReplyTo || null
      }

      setMessages(prevMessages => [...prevMessages, mainMessages]);
      return storeMessageInSQLite(db,mainMessages);

    }else{
      const mainMessages = {
        id: message.messageId,  // Ensure the correct field is mapped
        sender: message.sender,
        recipient: message.recipient,
        content: message.content,
        timestamp: message.timestamp,
        status: message.status,
        read: message.read,
        isReplyTo: message.isReplyTo || null
      }
      const messages = globalThis.storage.readJSON('messages', []) || [];
      messages.push(mainMessages);
      setMessages(prevMessages => [...prevMessages, mainMessages]);
      return globalThis.storage.setItem('messages', JSON.stringify(messages));
    }

    
  } catch (error) {
    console.error("error in saving messagessgsgs",error)
  }

}
const saveunread = async(sender)=>{

  try {
    return updateUnreadCountInSQLite(db,sender);
  } catch (error) {
    console.error("error in saving messagessgsgs",err)
  }

}

const getunread = async()=>{
  try {
    return getunreadcount(db)
  } catch (error) {
    console.error("error in getting unreadcount",err)
  }
}
const resetunread = async(sender)=>{

  try {
    return resetUnreadCountInSQLite(db,sender);
  } catch (error) {
    console.error("error in saving messagessgsgs",err)
  }

}
  const initialize = () => {
    console.log('WebSocket initialized');
  };

  return {
    connect,
    sendMessage,
    close,
    selectUser,
    setSelectedUser,
    selectedUser,
    socket: socket.current,

    db,
    saveMessage,
    getmessages,
    saveunread,
    resetunread,
    getunread,
    setCurrenuser,
    currentUser,
    messages,
    setMessages,
    unreadCounts,
    setUnreadCounts,
    setInitialMessageUserIds,
    initialMessageUserIds,
    setLatestMessageTimestamps,
    latestMessageTimestamps

  };
};

export default WebSocketService;

