import React, { useState, useEffect, useRef,useContext } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { LoginContext } from '../Contexts/UserContext';

import { nanoid } from 'nanoid';
import { IonContent } from '@ionic/react';
import StarLoader from './StarLoader' 
import img from '/img.jpg';
import { api } from "../services/api";
import { getAccessToken } from "../services/authTokens";
import Maindata from '../data.ts';
const NewChatwin = ({socket,messages,setMessages,saveMessage,selectedUser, messagestest,setMessagestest,setUsersMain}) => {
  const location = useLocation();
  const history = useHistory();

  const context = useContext(LoginContext);
 // const { socket,messages,setMessages,saveMessage,setSelectedUser } = useWebSocket(); // Use WebSocket context methods

  const {  name, phoneNumber } = location.state || {};
  const { host,getuser } = context;
  const [ws, setWs] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userid, setuserid] = useState([]);
  const [messages1, setMessages1] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [usersExist, setUserExist] = useState(false); // State to store sent messages
  const messagesEndRef = useRef(null);
  const [isloading, setIsloading] = useState(false);
  const messageContainerRef = useRef(null);
  const isdev = false;
  const currentuser = globalThis.storage.getItem('currentuser');

  useEffect(() => {
    // Fetch the list of chats from your backend or API
    const fetchChats = async () => {
setIsloading(true)
      const userarray = globalThis.storage.readJSON('usersMain', [])

     
      
      const token = await getAccessToken();
      console.log("right here but not there")
      console.log(JSON.stringify(userarray))
      var matchedUser = null
      await getuser(token)
      if(userarray.length !== 0){
         matchedUser = userarray.find(user => user.phoneNumber === phoneNumber);
        console.log(JSON.stringify(matchedUser))
      }
      if (matchedUser) {
        const matchedUser1 = userarray.find(user => user.phoneNumber === phoneNumber);
        console.log("sending the chat")
        
    setUserExist(true)
    setuserid(matchedUser); 
    selectedUser.current = matchedUser.id

    history.push('/chatwindow', { userdetails: matchedUser, callback: 'goBackToUserList',currentuser });
    setIsloading(false)
    return;

        // Handle user exists logic
      }else{
      try {
        const fetchedChats = await api.existsUser(host, phoneNumber);
        const res = await fetchedChats.json();


  
        if (!res.status) {
            setUserExist(false)
            console.log('res not exist',res)
        
            setMessages1([]);
            selectedUser.current = null
            
        setIsloading(false)
      
        }
        else{
            setUserExist(true)
            console.log('res exist',res)
      
          setuserid(res.userDetails);
          const userMain = globalThis.storage.readJSON('usersMain', []) || [];

          // Check if user exists in usersMain
          if (!userMain.find(user => user.id === res.userDetails.id)) {
            // User doesn't exist in usersMain, add the new user
            const newUser = {
              id: res.userDetails.id,
              name: res.userDetails.name,
              avatar: res.userDetails.profilePhoto || img,  // Assuming profilePhoto contains the image URL or base64 string
              lastMessage: 'No messages yet', // Placeholder if no message is present yet
              timestamp: new Date().toISOString(),
              phoneNumber: res.userDetails.phoneNumber,
              unreadCount: 0, // This message is unread for the new user
              updatedAt: res.userDetails.updatedAt,
              gender:res.userDetails.gender,
              dob:res.userDetails.DOB,
              Location:res.userDetails.Location,
              About:res.userDetails.About,
              publicKey:res.userDetails.publicKey
            };
            selectedUser.current = newUser.id
            // Add the new user to `usersMain` and localStorage
            setUsersMain(prevUsers => {
              // Ensure no duplicates by filtering out users with the same id
              const updatedUsers = [...prevUsers, newUser].filter((user, index, self) =>
                index === self.findIndex((u) => u.id === user.id)
              );
            
              console.log("updatedUsers",JSON.stringify(updatedUsers))
              
              globalThis.storage.setItem('usersMain', JSON.stringify(updatedUsers));
              console.log("after update", JSON.stringify(globalThis.storage.getItem('usersMain')))

              history.push('/chatwindow', { userdetails: newUser, callback: 'goBackToUserList',currentuser });
              setIsloading(false)
              return updatedUsers;
            });
            console.table("new user",newUser)
          }


         
    
          return () => {
         
          };  
          
          
           

        }
  
        // Assuming res is the expected JSON response
      } catch (error) {
        console.error('Error fetching chats:', error);
        // Handle error state or retry logic here
      }
    }
    };
  
    fetchChats();
  }, []);

//   useEffect(() => {
//     // Fetch messages for selected chat
//     if (selectedChat) {
//       const fetchMessages = async () => {
//         try {
//           const fetchedMessages = await fetch(`/api/messages/${selectedChat}`);
//           const messageList = await fetchedMessages.json();
//           setMessages(messageList);
//         } catch (error) {
//           console.error('Error fetching messages:', error);
//         }
//       };

//       fetchMessages();
//     }
//   }, [selectedChat]);

  useEffect(() => {
    // Scroll to bottom when messages are updated
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages1]);

  const handleBack = () => {
    history.push('/newchat');
  };
  const handleMessage = (event) =>{
    console.log(event)
  }

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleSearchSubmit = () => {
    // Implement search submit functionality here
  };

  const selectChat = (chatId) => {
    setSelectedChat(chatId);
    // Handle logic when a chat is selected
  };

  const sendMessage = async (e) => {

    e.preventDefault();
    if (newMessage.trim() === '') {
      return; // Prevent sending empty messages
    }

    // Check if user with provided phone number or name exists
 
    try {
        const currentuser = globalThis.storage.readJSON('currentuser', null)
   

      if (usersExist) {
        try{
            console.log("sendig the message")
        // User exists, send message via WebSocket (simulated here)
        
          const tempId = nanoid(12) + currentuser._id;
          const messageData = {
            type: 'messages',
            messageId: tempId,
            sender: currentuser._id,
            recipient: userid.id,
            content: newMessage,
            status: 'pending',
            timestamp: new Date().toISOString(),
            __v: 0
          };

          setMessages1(prevMessages => [...prevMessages, messageData]);
          
          setNewMessage('');
      saveMessage(messageData);
    
          
          
        }catch(error){
            console.log("error in sending message",error,JSON.parse(error))
            
        }  
      } else {
        // User doesn't exist, save message locally
        
        const tempId = nanoid(12) ;
            const sentMessage = {
              _id: tempId, // Generate a temporary ID
              sender: phoneNumber,
              recipient: selectedChat,
              content: newMessage.trim(),
              timestamp: new Date().toISOString(),
            };
        
         
            setMessages1(prevMessages => [...prevMessages, sentMessage]);
        
        
    
      }

      setNewMessage(''); // Clear the message input after sending
    } catch (error) {
      console.error('Error sending message:', error);
    }

  };


  const handleShare = async () => {
  const shareUrl = Maindata.ShareUrl;

  if (navigator.share) {
    await navigator.share({
      title: "Join me on MyApp EchoId",
      text: "Install this app and connect with me",
      url: shareUrl,
    });
  } else {
    await navigator.clipboard.writeText(shareUrl);
    alert("Link copied to clipboard");
  }
};

  const handleScroll = () => {
    // Implement scroll handler to fetch more messages
  };

  

  return (
    <div
      style={{
        minHeight: '100dvh',
        background:
          'radial-gradient(900px 500px at 85% -10%, rgba(0, 196, 255, 0.25), transparent 60%), radial-gradient(700px 400px at 10% 110%, rgba(24, 160, 255, 0.15), transparent 60%), linear-gradient(180deg, #f7fbff 0%, #f2f6fb 45%, #eef3f9 100%)',
      }}
    >
      {isloading && (
        <div
          style={{
            textAlign: 'center',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'fixed',
            top: '50%',
            left: '50%',
            zIndex: 999999,
            transform: 'translate(-50%, -50%)',
            background: ' rgba(0, 0, 0, 0.5',
            height: '100vh',
            width: '100%',
            overflowY: 'auto',
          }}
        >
          <StarLoader />
        </div>
      )}
      <div className="flex min-h-screen flex-col text-slate-900">
        {/* Top section with user info */}
        <div className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
          <div className="flex items-center px-5 py-4 text-slate-900">
            <button
              className="mr-3 rounded-full border border-slate-200 bg-white/80 p-2 text-slate-700 shadow-sm hover:bg-white focus:outline-none"
              onClick={handleBack}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                className="bi bi-arrow-left"
                viewBox="0 0 16 16"
              >
                <path
                  fillRule="evenodd"
                  d="M15 8a.5.5 0 0 1-.5.5H3.707l5.147 5.146a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 1 1 .708.708L3.707 7.5H14.5A.5.5 0 0 1 15 8z"
                />
              </svg>
            </button>
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 overflow-hidden rounded-full border border-slate-200 bg-white">
                <img src={img} alt={name} className="h-full w-full object-cover" />
              </div>
              <div>
                <h5 className="text-base font-semibold">{name || phoneNumber}</h5>
                <p className="text-xs text-slate-500">Invite to start a chat</p>
              </div>
            </div>
            <div className="ml-auto flex items-center">
              <button className="rounded-full border border-slate-200 bg-white/80 p-2 text-slate-500 shadow-sm hover:bg-white focus:outline-none">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  className="bi bi-three-dots-vertical"
                  viewBox="0 0 16 16"
                >
                  <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col items-center justify-center px-5 py-8">
          <div className="w-full max-w-xl rounded-[32px] border border-cyan-200/70 bg-white p-6 text-slate-900 shadow-[0_30px_80px_rgba(8,145,178,0.18)]">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500 text-white shadow-[0_10px_25px_rgba(6,182,212,0.45)]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  fill="currentColor"
                  className="bi bi-chat-dots"
                  viewBox="0 0 16 16"
                >
                  <path d="M2 2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2.586a1 1 0 0 0 .707-.293l2.414-2.414a1 1 0 0 1 .707-.293H14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H2z" />
                  <path d="M3 7a1 1 0 1 1 2 0 1 1 0 0 1-2 0m4 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0m4 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-900">This chat is waiting for an invite</h3>
                <p className="text-sm text-slate-600">
                  Send a quick invite link so they can join and you can start messaging.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4">
              <div className="text-xs uppercase tracking-widest text-cyan-700/70">Preview</div>
              <div className="mt-2 rounded-xl border border-cyan-100 bg-white p-4">
                {(() => {
                  const previewMessages = (messages1 || [])
                    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
                    .slice(-2);

                  if (previewMessages.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            fill="currentColor"
                            className="bi bi-link-45deg"
                            viewBox="0 0 16 16"
                          >
                            <path d="M4.715 6.542a3 3 0 0 1 4.243 0l.586.586a.5.5 0 0 1-.708.708l-.586-.586a2 2 0 0 0-2.829 0L3.5 9.179a2 2 0 0 0 2.829 2.829l.586-.586a.5.5 0 1 1 .708.708l-.586.586a3 3 0 0 1-4.243-4.243l1.92-1.92z" />
                            <path d="M6.172 4.828a3 3 0 0 1 4.243 0l1.92 1.92a3 3 0 0 1-4.243 4.243l-.586-.586a.5.5 0 0 1 .708-.708l.586.586a2 2 0 0 0 2.829-2.829l-1.92-1.92a2 2 0 0 0-2.829 0l-.586.586a.5.5 0 0 1-.708-.708l.586-.586z" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-800">No messages yet</div>
                          <div className="text-xs text-slate-500">
                            Share an invite to start the conversation.
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return previewMessages.map(msg => (
                    <div key={msg.id} className="mb-3 flex justify-end">
                      <div className="max-w-xs rounded-2xl bg-slate-900 p-3 text-sm text-white shadow">
                        <p>{msg.content}</p>
                        <small className="mt-2 block text-right text-[10px] text-white/70">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </small>
                      </div>
                    </div>
                  ));
                })()}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>
        </div>

        {/* Message input form */}
        <form onSubmit={sendMessage} className="border-t border-slate-200/80 bg-white/70 px-5 py-5">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={newMessage}
              disabled={true}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="User is not on Echoid yet. Send them an invite link."
              className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
            />
            <button
              onClick={handleShare}
              type="button"
              className="rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(8,145,178,0.35)] hover:bg-cyan-700"
            >
              Share Invite
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewChatwin;

