import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useHistory } from 'react-router';
import img from '/img.jpg';
import { nanoid } from 'nanoid';
import { isPlatform } from '@ionic/react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './chatcss.css'
import { FileOpener } from '@capawesome-team/capacitor-file-opener';
import Maindata from '../data';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Toast } from '@capacitor/toast';
import { FaPaperclip, FaImage, FaPaperPlane } from "react-icons/fa"; // Font Awesome icons
import { MdClose, MdDeleteSweep } from "react-icons/md";
import { App as CapacitorApp } from '@capacitor/app';
import Plyr from "plyr-react";
import forge from 'node-forge';

import StarLoader from './StarLoader';

import "plyr/dist/plyr.css";  
import EmojiPicker from "emoji-picker-react";
import { IoCheckmarkSharp } from "react-icons/io5";

import 'bootstrap-icons/font/bootstrap-icons.css';
//import { FaPlay, FaPause, FaPaperPlane, FaTimes } from 'react-icons/fa';
//import { FilePicker } from '@capawesome/capacitor-file-picker';
import { ffmpeg_thumnail } from 'ionic-thumbnail';
import 'bootstrap-icons/font/bootstrap-icons.css';
//import { BellIcon, BellOffIcon, Files, SettingsIcon } from 'lucide-react';
import { IonSpinner,IonButton } from '@ionic/react';
import VoiceRecordingUI from "../components/VoiceRecordingUI"; // adjust path accordingly
//import { Plugins } from '@capacitor/core';
//const { App } = Plugins;
//import ReactPlayer from 'react-player';
import { IonIcon } from '@ionic/react';
//import { IonLoading } from '@ionic/react';
//import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButtons, IonButton, IonImg } from '@ionic/react';
import { Capacitor } from '@capacitor/core';
import "./HomeScreen.css";
// Mock function to save file locally
//import  sv from '../../public/circuit-board/circuit-board.svg'
import ImageRenderer from '../components/ImageRenderer';
import VideoRenderer from '../components/VideoRenderer';
import DocumentRenderer from '../components/DocumentRenderer';
import { playCircleOutline,documentOutline,downloadOutline,arrowBackOutline, ellipsisVerticalOutline,closeCircleOutline,closeOutline, copyOutline, trashOutline, arrowRedoOutline,call,videocam }from 'ionicons/icons';
//import waveForm from '../components/WaveformPlayer'
//import { IoArchiveOutline, IoBanOutline, IoTrashOutline } from "react-icons/io5"; // Ionicons (Outline)
import { FaArrowDown } from 'react-icons/fa'; // Import the down arrow icon
//import { OneSignal } from 'onesignal-cordova-plugin';
import { getAccessToken } from "../services/authTokens";
import { api } from "../services/api";
import { authFetch } from "../services/apiClient";
import { getUploadUrl, isValidUploadResult } from "../services/uploadValidation";
//import { Http } from '@capacitor-community/http';
import VideoPlayerPlyrWithResolve from '../components/VideoPlayerPlyr';
import { CallRuntime } from "../store/CallRuntime";  // must be imported
import { buildUnreadUpdate } from "../services/wsPayloads";
import { IoCheckmarkDoneSharp } from "react-icons/io5";
// Function to save the video file locally
import { CiRead } from "react-icons/ci";

// export const saveFileLocally2 = async (blob, filename, filetype) => {
//   if (!isPlatform('android')) {
//     throw new Error('This function supports Android only.');
//   }
//   const mediaPlugin = new Media();

//   const granted = await PermissionsAndroid.request(
//     PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
//   );
//   if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
//     throw new Error('Storage permission denied');
//   }

//   const base64Data = await new Promise((resolve, reject) => {
//     const reader = new FileReader();
//     reader.onloadend = () => {
//       const result = reader.result;
//       resolve(result.split(',')[1]);
//     };
//     reader.onerror = reject;
//     reader.readAsDataURL(blob);
//   });

//   let saveOptions = {
//     base64: base64Data,
//     album: 'SwipeMedia',
//     filename,
//   };

//   let result;

//   switch (filetype) {
//     case 'image':
//       saveOptions.album = 'SwipeMedia';
//       result = await mediaPlugin.savePhoto(saveOptions);
//       break;
//     case 'video':
//       saveOptions.album = 'SwipeMedia';
//       result = await mediaPlugin.saveVideo(saveOptions);
//       break;
//     case 'audio':
//       saveOptions.album = 'SwipeAudio';
//       result = await mediaPlugin.saveAudio(saveOptions);
//       break;
//     case 'document':
//     default:
//       saveOptions.album = 'SwipeDocuments';
//       result = await mediaPlugin.saveDocument(saveOptions);
//       break;
//   }

//   // The returned result usually has a 'path' property (native file URI)
//   return result.path || null;
// };
/** 
 * Save any blob to Android scoped shared storage:
 *   /storage/emulated/0/Android/media/com.swipe/...
 */
export const saveFileToExternalStorage = async (blob, filename) => {
  try {
    // 1️⃣ Convert Blob → Base64
    const base64 = await blobToBase64(blob);
    const base64Data = base64.split(',')[1]; // strip prefix
    const mime = blob.type || '';

    // 2️⃣ Define scoped base folder (per appId)jj
    const baseDir = `Android/media/com.swipe`;

    // 3️⃣ Sort by type into Pictures / Movies / Documents
    let subDir;
    if (mime.startsWith('image/')) subDir = `${baseDir}/Pictures`;
    else if (mime.startsWith('video/')) subDir = `${baseDir}/Movies`;
    else subDir = `${baseDir}/Documents`;

    // 4️⃣ Write file to external shared directory
    const result = await Filesystem.writeFile({
      path: `${subDir}/${filename}`,
      data: base64Data,
      directory: Directory.External,
      recursive: true,
    });

    // 5️⃣ Convert URI → WebView-safe path
    const webPath = Capacitor.convertFileSrc(result.uri);

    console.log(`✅ Saved to: ${result.uri}`);
    return {
      name: filename,
      uri: result.uri,
      webPath,
      type: mime,
      folder: subDir,
    };
  } catch (err) {
    console.error('❌ Failed to save file to external storage:', err);
    throw err;
  }
};

export const saveFileLocally = async (blob, filename, filetype) => {
  if (!isPlatform('android')) {
    throw new Error('This function supports Android only. and this is original');
  }

  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
  );
  if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new Error('Storage permission denied');
  }

  // Convert blob to base64
  const base64Data = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  // Determine target folder based on filetype
  let folderPath = '';
  switch (filetype) {
    case 'image':
    case 'video':
      folderPath = 'DCIM/SwipeMedia'; // shows in Gallery
      break;
    case 'audio':
      folderPath = 'Music/SwipeAudio'; // shows in Music apps
      break;
    case 'document':
    default:
      folderPath = 'Documents/SwipeDocuments'; // accessible in file managers
      break;
  }

  const fullPath = `${folderPath}/${filename}`;

  // Ensure folder exists
  try {
    await Filesystem.stat({ path: folderPath, directory: Directory.ExternalStorage });
  } catch {
    await Filesystem.mkdir({
      path: folderPath,
      directory: Directory.ExternalStorage,
      recursive: true,
    });
  }

  // Write the file
  const savedFile = await Filesystem.writeFile({
    path: fullPath,
    directory: Directory.ExternalStorage,
    data: base64Data,
    encoding: Encoding.Base64,
  });

  // Trigger MediaScanner for gallery/music visibility


  return savedFile.uri;
};


const Chatwindo = ({ db,socket,setMessages,saveMessage,selectedUser, messagesRef,blockUser,unblockUser,blockedUsers,setMessagestest,messages,message,storeMessageInSQLite,setmutedList,setUsersMain,host,customSounds, setCustomSounds }) => {
    const location = useLocation();
    const history = useHistory();
const localchat_messages=useRef()
    //const { socket,messages,setMessages,saveMessage,setSelectedUser } = useWebSocket(); // Use WebSocket context methods
    const fileInputRef = useRef(null);
    const scrollRef = useRef(null);
//    const [loading, setLoading] = useState(false);
    // State to hold media files
    const [showFileOptions, setShowFileOptions] = useState(false);
    const [activeMediaIndex, setActiveMediaIndex] = useState(0);
    const [showMediaPreview, setShowMediaPreview] = useState(false);
    const imageVideoInputRef = useRef(null);
    let { userdetails } = location.state || {};
    const [messages1, setMessages1] = useState([]);
    const [newMessage, setNewMessage] = useState('');

    
    //const [selectedMedia, setSelectedMedia] = useState(null); // Add this line
 //   const [uploadProgress, setUploadProgress] = useState(0);
const[isDownloading,setisDownloading] = useState(false)
    const [user,setCurrentUser] = useState(null);
    const messagesEndRef = useRef(null);
    const videoRef = useRef(null);
    const [fullscreenImage, setFullscreenImage] = useState(null); // State for fullscreen image
   // Tracks downloading status
    const [previewVideo, setPreviewVideo] = useState(null); // Tracks video preview state
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [mediaFiles, setMediaFiles] = useState([]); // Store selected image/video files
    //const [showPreview, setShowPreview] = useState(false); // Toggle to show/hide preview
    const previewref = useRef(false);
    const previewObjectUrlsRef = useRef([]);
    //const [downloading, setDownloading] = useState({});
    //const [uploadingFiles, setUploadingFiles] = useState({});
//const [downloadingFiles, setDownloadingFiles] = useState({});
    // Fetch and filter messages based on user ID
    const [loadingMessages, setLoadingMessages] = useState({});
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedTab, setSelectedTab] = useState('images'); // Default to 'images' tab
    const [showAll, setShowAll] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [isInView, setIsInView] = useState(true);
    const [showMoreOptions, setShowMoreOptions] = useState(false);
const [isArchive,setIsarcivehs]=useState(false);
    const buttonRef = useRef(null);
    const [showOptions, setShowOptions] = useState(false);
    const [fileUploadError, setFileUploadError] = useState(false);
    const [fileDownloadError, setFileDownloadError] = useState(false);
const [prodilepicBIg,setprodilepicBIg]=useState(false);
const [isloading,setIsloading] = useState(false);
    const [selectedChats, setSelectedChats] = useState([]);
        const [selectionMode, setSelectionMode] = useState(false);
  const isDarkMode = true
  const mainuser = globalThis.storage.readJSON('currentuser', null)

  const userId = mainuser._id;        // caller
const targetId = userdetails.id;     // recipient
  const isTargetBlocked = blockedUsers?.has(targetId);
const [selectionModeFile, setSelectionModeFile] = useState(false);
// const menuRef = useRef<HTMLDivElement>(null)
  //const expandedMenuRef = useRef<HTMLDivElement>(null)
  // const attachmentMenuRef = useRef<HTMLDivElement>(null)
 //   const [showMenu, setShowMenu] = useState(false)
  const [showExpandedMenu, setShowExpandedMenu] = useState(false)
    // Filter and limit the number of files shown (max 10 images)
    // const MuteIcon = BellOffIcon;
    // const UnmuteIcon = BellIcon;
    // const CustomBellIcon = SettingsIcon;
const topMessageRef = useRef(null);
const replyGlowTimeoutRef = useRef(null);
const [glowMessageId, setGlowMessageId] = useState(null);
const [replyTargetMessage, setReplyTargetMessage] = useState(null);
const nearBottomRef = useRef(true);
const prevMessageCountRef = useRef(0);
const swipeReplyRef = useRef({
  activeId: null,
  startX: 0,
  startY: 0,
  triggered: false,
});


 


const [isRecording, setIsRecording] = useState(false);

let pressTimer = useRef(null);
//const [isPaused, setIsPaused] = useState(false);
 
const isPaused = false
useEffect(() => () => {
  if (replyGlowTimeoutRef.current) clearTimeout(replyGlowTimeoutRef.current);
}, []);

useEffect(() => {
  setReplyTargetMessage(null);
}, [userdetails?.id]);

useEffect(() => {
  const backHandler = CapacitorApp.addListener('backButton', () => {
    selectedUser.current = null; // Clear selected user
    history.push('/home'); // or history.push('/home') if you want to allow back to Chatwindo later
  });

  return () => {
    backHandler.remove();
  };
}, [history]);

  // useEffect(() => {
  //   const handleClickOutside = (event) => {
  //     if (menuRef.current && !menuRef.current.contains(event.target )) {
  //       setShowMenu(false)
  //     }
  //     if (expandedMenuRef.current && !expandedMenuRef.current.contains(event.target )) {
  //       setShowExpandedMenu(false)
  //     }
  //     if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target )) {
  //       setShowAttachmentMenu(false)
  //     }
  //   }

  //   document.addEventListener("mousedown", handleClickOutside)
  //   return () => document.removeEventListener("mousedown", handleClickOutside)
  // }, [])

const handlePressStart2 = () => {
  // Start a timer to detect long press (e.g., 500ms)
  pressTimer.current = setTimeout(() => {
    setIsRecording(true); // start recording
  }, 1500)//lng press duration threshold
};

const handlePressEnd2 = () => {
  // Clear timer, stop recording if it was started
  if (pressTimer.current) {
    clearTimeout(pressTimer.current);
  }

  if (isRecording) {
    setIsRecording(false); // stop recording on release
  }
};



const handlePressCancel = () => {
  // Clear timer if pointer leaves button area before long press
  if (pressTimer.current) {
    clearTimeout(pressTimer.current);
  }
};

const handleCancelRecording = () => {
    //console.log("Recording cancelled");
  // if (mediaRecorder && mediaRecorder.state !== 'inactive') {
  //   mediaRecorder.stop();  // stop MediaRecorder if recording
  // }

  setIsRecording(false);    // exit recording mode
//  setRecordedBlob(null);    // clear recorded audio
  //setAudioChunks([]);       // clear chunks
  //setIsPaused(false);       // reset pause state if any
 // setIsPlaying(false);      // reset play state if any
  //setSeekValue(0);          // reset seek bar if you use it
 // setRecordingTime(0);      // reset timer
};


    const toggleOptions = () => {
      setShowOptions(prev => !prev);
    };
  
    const handleShare = () => {
      //console.log("Share clicked");
      setShowOptions(false);
    };
  
    const handleEditContact = () => {
      //console.log("Edit Contact clicked");
      setShowOptions(false);
    };

     const timeoutRef = useRef(null);
    

      const handlePressStart = (message) => {
        timeoutRef.current = setTimeout(() => {
          //console.log('Long press detected',message);
          setSelectionMode(true);
          toggleSelect(message);
        }, 1000); // Long press after 600ms
      };
    

     


async function pickMediaAndSaveToShared() {
  return new Promise((resolve) => {
    const handler = (event) => {
      window.removeEventListener('MediaSelected', handler);

      const detail = event.detail || {};
      const names = detail.names || [];
      const types = detail.types || [];
      const previews = detail.previews || [];

      const files = names.map((name, i) => ({
        name,
        type: types[i],
        preview: previews[i],
      }));

      resolve(files);
    };

    window.addEventListener('MediaSelected', handler);

    if (window.NativeAds?.pickMediaNative) {
      window.NativeAds.pickMediaNative(0); // 0 = multiple
    } else {
      console.warn('❌ Native picker not available.');
      resolve([]);
    }
  });
}

const handlePickMedia = async () => {
  console.log("test before take 6")

  const selectedFiles = await pickMediaAndSaveToShared();
  if (selectedFiles.length) {
    console.log('Picked files:',  JSON.stringify(selectedFiles, null, 2));
    // You can call your handler like this:
    handleMediaSelect({ target: { files: selectedFiles } });
  }
};



const handlePickDocument = async () => {
  if (window.Capacitor && Capacitor.getPlatform() === 'android') {
    try {
      // Step 1: Let user pick a file using cordova-plugin-chooser
      const result = await new Promise((resolve, reject) => {
      window.chooser.getFile(resolve, reject);
    });

    const uri = result.uri;
  

    // Step 2: Get file info from your plugin
    const fileInfoFromPlugin = await ffmpeg_thumnail.getFileInfo({ uri });

    // Step 3: Build the file info object (spread plugin result)
    // Guess MIME type if not provided (simple example)
    const guessMimeType2 = (name) => {
      if (!name) return 'application/octet-stream';
      const ext = name.split('.').pop().toLowerCase();
      switch (ext) {
        case 'pdf': return 'application/pdf';
        case 'txt': return 'text/plain';
        case 'jpg':
        case 'jpeg': return 'image/jpeg';
        case 'png': return 'image/png';
        default: return 'application/octet-stream';
      }
    };

    const fileInfo = {
      name: fileInfoFromPlugin.name || 'unknown',
      size: fileInfoFromPlugin.size || 0,
      type: fileInfoFromPlugin.type || guessMimeType2(fileInfoFromPlugin.name),
      path: fileInfoFromPlugin.localPath || fileInfoFromPlugin.uri,
      fileObject: fileInfoFromPlugin.fileObject || null,
    };

    // Step 4: Prepare the mock event with one file
    const mockEvent = {
      target: {
        files: [fileInfo],
      },
    };

    console.log("📤 Dispatching to handleFileSelection:", mockEvent);
     handleFileSelection(mockEvent); // Call your handler here


    } catch (err) {
      console.error("❌ Error picking document:", err);
    }
  } else {
    // Fallback for web
    if (fileInputRef?.current) {
      fileInputRef.current.click();
    }
  }
};



// Helper: Guess filename from URI (if nothing else works)
// Helper: Basic MIME type guess based on extension

const handleStartCall = (callOnly = false) => {

  CallRuntime.set({
    mode: "call",                 // caller side
    targetUser: targetId,
    currentUser: userId,
    callOnly,
    userdetail: userdetails
  });

};
      const handleScroll = () => {
        const el = scrollRef.current;
  
        if (!el) return;

        // flex-col-reverse: visual bottom sits near scrollTop = 0
        nearBottomRef.current = el.scrollTop <= 140;
   
        // Because of flex-col-reverse, bottom = top visually
        const tops = el.scrollTop + el.scrollHeight - 15;
     
        if (tops <= el.clientHeight) {
          console.log("🚀 Load more messages...");
         loadMoreMessages();
        }
      };


        const loadMoreMessages = async () => {
          
          const el = scrollRef.current;
const prevScrollTop = el.scrollTop;

          // Fetch older messages (e.g., +45)
        //  await fetchMoreFromBackend(); // You implement this
        if (isPlatform('hybrid')) {
          // Load the next 45 messages (use the correct offset for pagination)
          const newMessages = await getMessagesFromSQLite(db, userdetails, 45, messages1.length);
  
       //   setMessages1(prevMessages => [...newMessages, ...prevMessages]); // Prepend the messages (since you're loading older messages)
          if (newMessages.length > 0) {
            setMessages1(prevMessages => {
              const updatedMessages = [...newMessages, ...prevMessages];
      
              // ✅ Sync the ref if total is still < 91
              if (updatedMessages.length < 91) {
                messagesRef.current = [...newMessages, ...messagesRef.current];
                setMessagestest(prev => [...newMessages, ...prev]);
                    // Save local message early for optimistic UI
                 setMessages(prev => [...newMessages, ...prev]);
              }
      
              return updatedMessages;
            });

            localchat_messages.current = [...newMessages, ...localchat_messages.current];
      setTimeout(() => {
        el.scrollTop = prevScrollTop;
      }, 50); // Adjust delay if needed
   
          }

          // setTimeout(() => {
          //   const newScrollHeight = el.scrollHeight;
          //   el.scrollTop = newScrollHeight - previousScrollHeight;
          // }, 50); // 50-100ms usually safe
        }
   

          // Delay to ensure DOM updates
        
        };
        const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onloadend = () => {
      const base64 = reader.result.split(',')[1]; // remove `data:audio/...;base64,`
      resolve(base64);
    };
    reader.readAsDataURL(blob);
  });
};

const SendAudio_base = async (audioBlob) => {
  return new Promise((resolve, reject) => {
    const folderPath = window.cordova?.file?.externalRootDirectory + "Music/Swipe/";
    const fileName = `audio_${Date.now()}.mp3`;

    // Ensure Swipe subfolder exists
    window.resolveLocalFileSystemURL(folderPath, (dirEntry) => {
      saveToFile(dirEntry);
    }, (err) => {
      // Create the folder if it doesn't exist
      window.resolveLocalFileSystemURL(
        window.cordova?.file?.externalRootDirectory + "Music/",
        (musicDir) => {
          musicDir.getDirectory("Swipe", { create: true }, (dirEntry) => {
            saveToFile(dirEntry);
          }, reject);
        },
        reject
      );
    });

    function saveToFile(dirEntry) {
      dirEntry.getFile(fileName, { create: true, exclusive: false }, (fileEntry) => {
        fileEntry.createWriter((fileWriter) => {
          fileWriter.onwriteend = () => {
            // Optional: trigger media scan
            if (window.MediaScannerConnection) {
              window.MediaScannerConnection.scanFile(fileEntry.nativeURL);
            }

            resolve({
              name: fileName,
              size: audioBlob.size,
              path: fileEntry.toURL(),
              type: 'audio/mp3',
            });
          };

          fileWriter.onerror = (err) => {
            console.error('Write failed:', err);
            reject(err);
          };

          fileWriter.write(audioBlob);
        }, reject);
      }, reject);
    }
  });
};



        const SendAudio = async (audioBlob) => {
const token = await getAccessToken();
            const messageId = generateMessageId(user._id);
  const timestamp = new Date().toISOString();

      const path = await SendAudio_base(audioBlob);
  //console.log("file when sending",path)

  // Base message shared by both ws and local
  const baseMessage = {
    id: messageId,
    sender: user._id,
    recipient: userdetails.id,
    content: null,
    timestamp,
    status: "pending",
    read: 0,
    isDeleted: 0,
    type: "file",
    file_name: path.name,
    file_type: 'audio/mp3', // Assuming audio file type

    file_size: path.size,
    isError: 0,
    isSent: 0,
  };

  const localPath = path.path || path.uri || path.name;
  const localMessage = {
    ...baseMessage,
    isDownload: 1,
    file_path: localPath,
    thumbnail: null,
  };

  const wsMessage = {
    ...baseMessage,
    isDownload: 0,
    file_path: null,
    thumbnail: null,
  };

  try {
    // Show UI loading states
  //  setUploadingFiles(prev => ({ ...prev, [path.name]: true }));
    setLoadingMessages(prev => ({ ...prev, [messageId]: true }));
    setisDownloading(prev => ({ ...prev, [messageId]: true }));

    // Save local message early for optimistic UI
    setMessages(prev => [...prev, localMessage]);
    setMessagestest(prev => [...prev, localMessage]);
    messagesRef.current = [...messagesRef.current, localMessage];
    setMessages1(prev => [...prev, localMessage]);

    // Upload file and get signed URL
    const signedUrl = await uploadFile(path,token);
    const uploadUrl = getUploadUrl(signedUrl);

    // Validate the response strictly
    if (!isValidUploadResult(signedUrl)) {
      throw new Error("❌ Invalid signed URL received from uploadFile");
    }

    wsMessage.file_path = uploadUrl;

    if(localMessage.isError == 0  && uploadUrl){
  const result = await saveMessage(wsMessage);
  //console.log("result",result)
  if (result?.status === 'sent') {
    localMessage.isSent = 1;
    localMessage.isError = result.message.isError;
  } else {
    localMessage.isSent = 0;
    localMessage.isError = result.message.isError;
  }
  
}else{
  localMessage.isSent = 0;
  localMessage.isError = 1;
}


        }catch (err) {
            console.error(`❌ Error processing file: ${path.name}`, err);
   
    localMessage.isError = 1;
    localMessage.isSent =  0;
    //console.log("localMessage",localMessage)
    setFileUploadError(true);

        }finally{
          
  setMessages(prev => [...prev.filter(m => m.id !== messageId), localMessage]);
    setMessagestest(prev => [...prev.filter(m => m.id !== messageId), localMessage]);
    messagesRef.current = messagesRef.current.map(m =>
      m.id === messageId ? localMessage : m
    );
    setMessages1(prev => [...prev.filter(m => m.id !== messageId), localMessage]);
    //console.log("local message",messages1)
    // Save to local storage
    if (isPlatform('hybrid')) {
      //console.log("Saving to SQLite:", db);

      try{
      await storeMessageInSQLite(db, localMessage);

         
    setLoadingMessages(prev => ({ ...prev, [messageId]: false }));
    setisDownloading(prev => ({ ...prev, [messageId]: false }));
  }catch(error){
    //console.log("error in saving to sqlite",error)
  
    setLoadingMessages(prev => ({ ...prev, [messageId]: false }));
    setisDownloading(prev => ({ ...prev, [messageId]: false }));
  }
    } else {
      //console.log("before saving",localMessage)
      const messages = globalThis.storage.readJSON("messages", null) || [];
      messages.push(localMessage);
      globalThis.storage.setItem("messages", JSON.stringify(messages));
         
    setLoadingMessages(prev => ({ ...prev, [messageId]: false }));
    setisDownloading(prev => ({ ...prev, [messageId]: false }));

    }

    // Reset loading states

    //console.log(`✅ Finished processing file: ${path.name}`);
        }}
        

      
    
      const handlePressEnd = () => {
        clearTimeout(timeoutRef.current);
      };
      const toggleSelect = (message) => {
        //console.log('Toggling selection for message:', message.id, selectedChats);
      
        const updatedSelectedChats = selectedChats.some(selectedMessage => selectedMessage.id === message.id)
          ? selectedChats.filter(selectedMessage => selectedMessage.id !== message.id) // Unselect if already selected
          : [...selectedChats, message]; // Select the message if not selected
      
        setSelectedChats(updatedSelectedChats);
      
        // Exit selection mode if no message is selected
        if (updatedSelectedChats.length === 0) {
          setSelectionMode(false);
        }
      };
      
  const handleCopy = async () => {
  if (!selectedChats || selectedChats.length === 0) {
    //console.log('No message selected for copying.');
    return;
  }

  if (selectedChats.length > 1) {
    alert('You can only copy one message at a time.');
    return;
  }

  const message = selectedChats[0];
  if (message.type !== 'messages') {
    alert('Only text messages can be copied.');
    return;
  }

   navigator.clipboard.writeText(message.content)
    .then(() => {
   
      //console.log('Message copied to clipboard:', message.content);
    })
    .catch(err => {
      console.error('Failed to copy text: ', err);
    });
           await Toast.show({
      text: 'Copied to clipboard',
      duration: 'short',
    });
};

      const handleDelete = async () => {
  try {
    if (!selectedChats || selectedChats.length === 0) {
      //console.log('No chat messages selected for deletion.');
      return;
    }
   

    const messageIds = selectedChats.map(chat => chat.id);

    // Platform detection


    if (isPlatform('hybrid')) {
        const recipientOnlyIds = [];

      // Hybrid: Delete from Cordova SQLite
      messageIds.forEach(id => {
        db.transaction(tx => {
          tx.executeSql(
            'DELETE FROM messages WHERE id = ?',
            [id],
            () => //console.log(`Deleted message ${id} from SQLite`),
            (tx, error) => console.error(`SQLite delete error: ${error.message}`)
          );
        });
      });
    } else {
      // Web: Delete from localStorage
      const stored = globalThis.storage.getItem('messages');
      if (stored) {
        const messages = JSON.parse(stored);
        const updated = messages.filter(msg => !messageIds.includes(msg.id));
        globalThis.storage.setItem('messages', JSON.stringify(updated));
        //console.log('Messages removed from localStorage');
      }
    }

    // Remove from refs
    if (localchat_messages.current) {
      localchat_messages.current = localchat_messages.current.filter(
        msg => !messageIds.includes(msg.id)
      );
    }

  
  if (messagesRef.current) {
    messagesRef.current = messagesRef.current.filter(msg => {
      if (messageIds.includes(msg.id)) {
        if (msg.recipient === userdetails.id) {
          recipientOnlyIds.push(msg.id);
        }
        return false;
      }
      return true;
    });
  }
        const updatePayload = {
                    type: 'update',
                    updateType: 'delete',
                    messageIds:recipientOnlyIds,
                    sender,
                    recipient
                  };
    socket.send(JSON.stringify(updatePayload));
    setSelectedChats([]);
          await Toast.show({
      text: 'Messages deleted successfully',
      duration: 'short',
    });

    //console.log("Selected messages deleted successfully.");
  } catch (error) {
    console.error("Error deleting selected messages:", error);
  }
};


      
      const handleForward = () => {
        // Logic to forward selected messages or users
        //console.log('Forward action triggered.',selectedChats);
       history.push('/forwardScreen', { forwardedMessages: selectedChats });
        // Example: open a forward modal or navigate to a forward page
      };
    
      const handleClick = (message) => {
        if (selectionMode) {
          //console.log('Selection mode active', selectionMode);
          toggleSelect(message); // If already in selection mode, click means select/unselect
        } else {
          //console.log('Selection mode active not', selectionMode);
        
        }
      };
    
      const isSelected = (message) => selectedChats.some(selectedMessage => selectedMessage.id === message.id)
    // Handle the click event to expand/collapse the header


    const toggleHeader = () => {
      //console.log("toggleHeader");
      setIsExpanded(!isExpanded);
    }
    const toglebigscreen = () => {
      //console.log("toglebigscreen");
      setprodilepicBIg(!prodilepicBIg)
      //console.log("prodilepicBIg",prodilepicBIg);
    }
    const getMessagesFromSQLite = async (db, userdetail, limitPerUser, offset = 0) => {
      return new Promise((resolve, reject) => {
        // Step 1: Get the list of other users
        //console.log("Fetching messages for user:", JSON.stringify(userdetail)); // Log start of fetching messages
    
        db.transaction(tx => {
          tx.executeSql(
            `SELECT DISTINCT CASE
                                 WHEN sender = ? THEN recipient
                                 ELSE sender
                               END AS other_userid
             FROM messages
             WHERE sender = ? OR recipient = ?`,
            [userdetail.id, userdetail.id, userdetail.id],
            (tx, results) => {
              const otherUserIds = [];
              for (let i = 0; i < results.rows.length; i++) {
                otherUserIds.push(results.rows.item(i).other_userid);
              }
    
              //console.log("Other userIds fetched:", JSON.stringify(otherUserIds)); // Log the userIds fetched
    
              // Step 2: Fetch the latest messages between the currentUser and each other user
              const messagesPromises = otherUserIds.map(userId =>
                new Promise((resolveMessages, rejectMessages) => {
                  tx.executeSql(
                    `SELECT id, sender, recipient, content, timestamp, status, read,
                            isDeleted, isDownload, type, file_type, file_name, file_path, file_size,
                            isSent, isError, thumbnail, encryptedMessage, encryptedAESKey, eniv, isReplyTo
                     FROM messages
                     WHERE (sender = ? AND recipient = ?) OR (sender = ? AND recipient = ?)
                     ORDER BY timestamp DESC
                     LIMIT ? OFFSET ?`,
                    [userdetail.id, userId, userId, userdetail.id, limitPerUser, offset],
                    (tx, results) => {
                      const messages = [];
                      for (let i = 0; i < results.rows.length; i++) {
                        const row = results.rows.item(i);
                        messages.push({
                          id: row.id,
                          sender: row.sender,
                          recipient: row.recipient,
                          content: row.content,
                          timestamp: new Date(row.timestamp).toISOString(),
                          status: row.status,
                          read: row.read === 1, // Convert read flag back to boolean
                          isDownload: row.isDownload,
                          isDeleted: row.isDeleted,
                          type: row.type,
                          file_type: row.file_type,
                          file_name: row.file_name,
                          file_path: row.file_path,
                          file_size: row.file_size,
                          isSent: row.isSent,
                          isError: row.isError,
                          thumbnail: row.thumbnail,
                          encryptedMessage: row.encryptedMessage,
                          encryptedAESKey: row.encryptedAESKey,
                          eniv: row.eniv,
                          isReplyTo: row.isReplyTo || null

                        });
                      }
                      //console.log(`Messages for user ${userId}:`, JSON.stringify(messages)); // Log the messages for each user
                      resolveMessages(messages);
                    },
                    (tx, error) => {
                      console.error("Error fetching messages for user", userId, JSON.stringify(error)); // Log errors specific to each user fetch
                      rejectMessages(error);
                    }
                  );
                })
              );
    
              // Wait for all the messages to be fetched for each user
              Promise.all(messagesPromises)
                .then(allMessages => {
                  // Flatten the messages array from all users
                  const flatMessages = allMessages.flat();
                  // Sort messages by timestamp ASC
                  flatMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
                  //console.log("All messages fetched and sorted:", JSON.stringify(flatMessages)); // Log the final sorted messages
                  resolve(flatMessages); // Resolve with the array of messages
                })
                .catch(error => {
                  console.error("Error fetching all messages:", JSON.stringify(error)); // Log if there's an issue in fetching all messages
                  reject(error);
                });
            },
            (tx, error) => {
              console.error("Error fetching other users:", JSON.stringify(error)); // Log error in fetching other users
              reject(error);
            }
          );
        });
      });
    };
    
 

    useEffect(() => {
      
    console.error = () => {};
        const fetchFilteredMessages = async () => {
        setIsloading(true)
          try{
           const mainuser = globalThis.storage.readJSON('currentuser', null);
       //console.log("this should not run when recived");
            setCurrentUser(mainuser);
            const userId = mainuser?._id;
         //console.log(userdetails)
            setIsarcivehs(userdetails.isArchive);

         

       const seenIds = new Set();
const filteredMessages = messagesRef.current
  .filter(msg => msg.sender === userdetails.id || msg.recipient === userdetails.id)
  .filter(msg => {
    if (seenIds.has(msg.id)) return false;
    seenIds.add(msg.id);
    return true;
  });

         
         console.log("filteredMessages",filteredMessages)
  
            setMessages1(filteredMessages);
            localchat_messages.current = filteredMessages
            for (const msg of filteredMessages) {
              if ( msg.isSent === 0 && msg.isError === 0 && msg.sender !== userdetails.id) {  
                try {
                  if (socket && socket.readyState === WebSocket.OPEN) {
                    const sentmsg = { ...msg, messageId: msg.id, isSent: 1 };
console.log("sending message culprit?",JSON.stringify(sentmsg))
                    await socket.send(JSON.stringify(sentmsg));
                
                    // Mark as sent
                    msg.isSent = 1;
                    msg.isError = 0;
                    updateMessageForSent(msg);     
            
                    // Update in reference array
                    localchat_messages.current = localchat_messages.current.map((message) =>
                      message.id === msg.id ? { ...message, isSent: 1,isError: 0 } : message
                    );
                    messagesRef.current = messagesRef.current.map((message) =>
                      message.id === msg.id ? { ...message, isSent: 1, isError: 0 } : message
                    );
                  } else {
                    // Socket not ready, do nothing (no isError update)
                    //console.log("Socket not open for message:", msg.id);
                  }
            
                } catch (error) {
                  console.error("Error sending message:", error);
                  // Still no isError update as per your logic
                }
              }
            }
            
            if (filteredMessages.length > 0) {
           
              const unreadMessages = filteredMessages.filter((msg) => msg.read === 0 && msg.sender === userdetails.id);
          

             
              if (unreadMessages.length > 0) {
                
                const pairs = new Map();
                unreadMessages.forEach((msg) => {
                  const pairKey = `${msg.sender}-${msg.recipient}`;
                  if (!pairs.has(pairKey)) {
                    pairs.set(pairKey, { sender: msg.sender, recipient: msg.recipient, messageIds: [] });
                  }
                  pairs.get(pairKey).messageIds.push(msg.id);
                });
  
                pairs.forEach(({ sender, recipient, messageIds }) => {
                  const updatePayload = buildUnreadUpdate({
                    messageIds,
                    sender,
                    recipient
                  });
              
//console.log("unread message from chatwindf")
              
                  // Send update type message through WebSocket
                  socket.send(
                    JSON.stringify({
                      updatePayload,
                    })
                  );
                });
          
                // Check the platform (Android, iOS, or Hybrid) and update accordingly
    
                  // If on Android, iOS, or Hybrid (web-based in this case), update the SQLite database
                  if (isPlatform('hybrid')) {
                    const messageIds = unreadMessages.map(msg => msg.id);

                    //console.log("Android: updating read status for messages", messageIds);

                    const query = `
                      UPDATE messages
                      SET read = 1
                      WHERE id IN (${messageIds.map(() => '?').join(',')})
                    `;
                  
                    db.transaction(tx => {
                      tx.executeSql(
                        query,
                        messageIds,
                        (_, result) => {
                          //console.log(`✅ Updated read status for ${result.rowsAffected} message(s)`);
                        },
                        (_, error) => {
                          console.error("❌ Error updating message read status:", error);
                          return false;
                        }
                      );
                    });
                  } else {
                 //console.log("Web: updating read status for messages", unreadMessages);
                    // For Web (hybrid), update in localStorage
                    unreadMessages.forEach((messageObj) => {
                      const { id } = messageObj;
                  //console.log("id",id)
                      const message = filteredMessages.find((msg) => msg.id === id);
                     
                  
                      if (message) {
                          // Retrieve stored messages from localStorage
                          const storedMessages = globalThis.storage.readJSON('messages', []) || [];
                  
                          // Update the read status
                          const updatedMessages = storedMessages.map((msg) =>
                              msg.id === id ? { ...msg, read: 1 } : msg
                          );
                  
                          // Save updated messages back to localStorage
                          //saveMessagesToLocalStorage(updatedMessages,"from chatwindo");
                          //console.log("Messages updated in localStorage:", updatedMessages);
                         globalThis.storage.setItem('messages', JSON.stringify(updatedMessages));
                        
                      } else {
                          console.warn(`Message with ID: ${id} not found in filteredMessages.`);
                      }
                  });
                  }
                
          
                // Set unread count for respective sender to 0
                const senderId = unreadMessages[0].sender;
               
                setMessages1((prevMessages) =>
                  prevMessages.map((msg) =>
                    Array.isArray(unreadMessages.id) && unreadMessages.id.includes(msg.id)
                      ? { ...msg, read: true }
                      : msg
                  )
                );
                
            
                localchat_messages.current = localchat_messages.current.map((msg) =>
                  msg.sender === senderId ? { ...msg, read: 1 } : msg
                );
             
              }
            }
          
          }
          catch(error){
            

            //console.log("error in chatwindo while fetchfiltering",JSON.stringify(error))
          }
           
        };

            const updateuser = async () => {
  const savedUsers = globalThis.storage.readJSON('usersMain', []) || [];

  // 1. Find the user matching userdetails.id
  const targetUser = savedUsers.find(u => u.id === userdetails.id);
  if (!targetUser) {
    console.warn("User not found in localStorage");
    return;
  }

  // 2. Build timestamps payload
  const timestamps = [{
    id: targetUser.id,
    updatedAt: targetUser.updatedAt || new Date(0).toISOString()
  }];

  try {
    // 3. Make the request to backend
    const response = await api.allUsers(host, timestamps);

    // 4. Handle response
    if (response.ok) {
      const data = await response.json();
      const { userDetails, currentUserId } = data;

      if (userDetails.length === 0) {
        // No updates found
        return;
      }

      // 5. Update local usersMain
      const updatedUserMap = new Map(userDetails.map(u => [u.id, u]));
      const mergedUsers = savedUsers.map(user => {
        const updated = updatedUserMap.get(user.id);
        if (!updated) return user;

        return {
          ...user,
          name: updated.name ?? user.name,
          email: updated.email ?? user.email,
          gender: updated.gender ?? user.gender,
          unreadCount: 0,
          dob: updated.dob ?? user.dob,
          location: updated.location ?? user.location,
          updatedAt: updated.updatedAt ?? user.updatedAt,
          avatar: updated.profilePic || user.avatar || 'default.jpg',
          About: updated.About || user.About,
          publicKey: updated.publicKey || user.publicKey,
        };
      });

      // 6. Save updated users
      globalThis.storage.setItem('usersMain', JSON.stringify(mergedUsers));

      // 7. Update state
      setUsersMain(mergedUsers);

      userdetails = mergedUsers.find(u => u.id === userdetails.id);
    } else {
      console.error("Failed to fetch updated user data");
    }
  } catch (err) {
    console.error("Error updating user:", err);
  }
};
const handleVideoCall = () =>{

}

const introCreatedAt = userdetails?.updatedAt || userdetails?.timestamp || null;
const introAvatar = userdetails?.avatar || img;
const introName = userdetails?.name || userdetails?.phoneNumber || "Chat";
const introDescription = userdetails?.About || "Messages are end-to-end encrypted.";
 const getkey = async () => {
  let key = userdetails.publicKey;

  if (!key) {
    try {
      const token = await getAccessToken();
      const response = await fetch(`https://${Maindata.SERVER_URL}/user/getPublicKey/${userdetails.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Auth': token,
        },
      });

      const data = await response.json();

      if (data.success && data.publicKey) {
        key = data.publicKey;

        // Update localStorage usersMain
        let usersMain = globalThis.storage.readJSON("usersMain", null) || [];

        // If it's a single user object, convert to array
        if (!Array.isArray(usersMain)) {
          usersMain = [usersMain];
        }

        const updatedUsers = usersMain.map(user => {
          if (user.id === userdetails.id) {
            return { ...user, publicKey: key };
          }
          return user;
        });

        globalThis.storage.setItem("usersMain", JSON.stringify(updatedUsers));
        // Optionally: update userdetails in your state/UI too
        setUsersMain(updatedUsers);
        userdetails.publicKey = key;
      }
    } catch (error) {
      console.error("Failed to fetch public key:", error);
    }
  }

  return key;
};

 getkey();
  updateuser()
        fetchFilteredMessages();


    
        
       

    setIsloading(false)



        const storedUsers = globalThis.storage.readJSON('usersMain', []);

// Update only the matched user's unread count
const updatedUsers = storedUsers.map(user => 
  user.id === userdetails.id 
    ? { ...user, unreadCount: 0 } 
    : user
);

// Update local state


// Save back to localStorage
globalThis.storage.setItem('usersMain', JSON.stringify(updatedUsers));

        setUsersMain((prevUsersMain) =>
          prevUsersMain.map((user) =>
            user.id === userdetails.id
              ? { ...user, unreadCount: 0 }  // Change unread count to 0 for the specific user
              : user // Keep other users the same
          )
        );
        
        // Save the updated users back to localStorage

          globalThis.storage.setItem('usersMain', JSON.stringify(updatedUsers));
      
        

     
    }, [ ]); // Add socket as a dependency
    useEffect(() => {
  // Keep chat screen in sync with parent message state updates (status/read receipts).
  const sourceMessages = Array.isArray(messages) ? messages : (messagesRef.current || []);
  const seenIds = new Set();

  const filteredMessages = sourceMessages
    .filter((msg) => msg.sender === userdetails.id || msg.recipient === userdetails.id)
    .filter((msg) => {
      if (seenIds.has(msg.id)) return false;
      seenIds.add(msg.id);
      return true;
    });

  setMessages1(filteredMessages);
  localchat_messages.current = filteredMessages;
}, [messages, userdetails.id, messagesRef]);

    // useEffect(() => {
    //   if (videoRef.current) {
    //     // Initialize Plyr for both web and Android using WebView
    //     new Plyr(videoRef.current);
    //   }
  
    //   return () => {
    //     // Clean up Plyr instance on unmount
    //     if (videoRef.current && videoRef.current.plyr) {
    //       videoRef.current.plyr.destroy();
    //     }
    //   };
    // }, []);
    // Scroll to the bottom initially and whenever messages change

    // useEffect(() => {
    //     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    
    // }, [messages1,localchat_messages.current]);


    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, []);
    useEffect(() => {
      const nextCount = Number(messages1?.length || 0);
      const prevCount = Number(prevMessageCountRef.current || 0);
      if (nextCount > prevCount && nearBottomRef.current) {
        requestAnimationFrame(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        });
      }
      prevMessageCountRef.current = nextCount;
    }, [messages1?.length]);
    useEffect(() => {
      if (videoRef.current) {
        // Initialize Plyr for both web and Android using WebView
        new Plyr(videoRef.current);
      }
  
      return () => {
        // Clean up Plyr instance on unmount
        if (videoRef.current && videoRef.current.plyr) {
          videoRef.current.plyr.destroy();
        }
      };
    }, []);

    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    useEffect(() => {
      const mutedUsers = globalThis.storage.readJSON('mutedUsers', []) || [];
      if (mutedUsers.includes(userdetails.id)) {
        setIsMuted(true);
      }
    }, [userdetails]);


useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsInView(entry.isIntersecting);
    }, { threshold: 1.0 });

    if (messagesEndRef.current) {
      observer.observe(messagesEndRef.current);
    }

    return () => {
      if (messagesEndRef.current) {
        observer.unobserve(messagesEndRef.current);
      }
    };
  }, []);

  // Scroll to the messagesEndRef when the button is clicked
  const scrollToMessages = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };


  const updateMessageForSent = async (message) => {
    if (isPlatform('hybrid')) {
      // Hybrid platform (e.g., mobile app with Capacitor or Cordova)
      console.info('Updating message for sent:', message);
      try {
        const defaultValues = {
          isSent: 1,
          isError: 0,
          isDeleted: 0,
          isDownload: 0,
          content: '',
          file_name: '',
          file_type: null,
          file_size: 0,
          thumbnail: null,
          file_path: '',
          timestamp: new Date().toISOString(),
          status: 'pending',
          read: 0,
          encryptedMessage: '',
          encryptedAESKey: '',
          type: 'text',
          eniv: '',
          isReplyTo: null
        };

        const updatedMessage = {
          id: message.id,
          sender: message.sender,
          recipient: message.recipient,
          content: message.content || defaultValues.content,
          timestamp: message.timestamp || defaultValues.timestamp,
          status: message.status || defaultValues.status,
          read: message.read !== undefined ? message.read : defaultValues.read,
          isDeleted: message.isDeleted !== undefined ? message.isDeleted : defaultValues.isDeleted,
          isDownload: message.isDownload !== undefined ? message.isDownload : defaultValues.isDownload,
          file_name: message.file_name || defaultValues.file_name,
          file_type: message.file_type || defaultValues.file_type,
          file_size: message.file_size !== undefined ? message.file_size : defaultValues.file_size,
          thumbnail: message.thumbnail || defaultValues.thumbnail,
          file_path: message.file_path || defaultValues.file_path,
          isError: message.isError !== undefined ? message.isError : defaultValues.isError,
          isSent: message.isSent !== undefined ? message.isSent : defaultValues.isSent,
          encryptedMessage: message.encryptedMessage || defaultValues.encryptedMessage,
          encryptedAESKey: message.encryptedAESKey || defaultValues.encryptedAESKey,
          type: message.type || defaultValues.type,
          eniv: message.eniv,
          isReplyTo: message.isReplyTo ?? defaultValues.isReplyTo

        };
        // Update message in SQLite (Cordova/Capacitor app)
     // Assume you have a function that opens the SQLite database
        const updateQuery = `
          UPDATE messages SET
            content = ?, 
            timestamp = ?, 
            status = ?, 
            read = ?, 
            isDeleted = ?, 
            isDownload = ?, 
            file_name = ?, 
            file_type = ?, 
            file_size = ?, 
            thumbnail = ?, 
            file_path = ?, 
            isError = ?, 
            isSent = ?,
            type = ?,
            encryptedMessage = ?,
            encryptedAESKey = ?,
            eniv = ?,
            isReplyTo = ?
          WHERE id = ?
        `;
  
        const values = [
          updatedMessage.content, 
          updatedMessage.timestamp, 
          updatedMessage.status, 
          updatedMessage.read, 
          updatedMessage.isDeleted, 
          updatedMessage.isDownload, 
          updatedMessage.file_name, 
          updatedMessage.file_type, 
          updatedMessage.file_size, 
          updatedMessage.thumbnail, 
          updatedMessage.file_path, 
          updatedMessage.isError, 
          updatedMessage.isSent, 
          updatedMessage.type,
          updatedMessage.encryptedMessage,
          updatedMessage.encryptedAESKey,
          updateMessage.eniv,
          updatedMessage.isReplyTo,
          updatedMessage.id

        ];
  
        await db.executeSql(updateQuery, values);
        //console.log("Updated message in SQLite:", message);
      } catch (err) {
        console.error("Error updating message in SQLite:", err);
      }
    } else if (isPlatform('web')) {
      // Web platform (e.g., desktop or browser)
      try {
        const messages = globalThis.storage.readJSON('messages', []) || [];
        
        // Update the message in the localStorage array of messages
        const updatedMessages = messages.map(msg => {
          if (msg.id === message.id) {
            return {
              ...msg,
              content: message.content || msg.content,
              timestamp: message.timestamp || msg.timestamp,
              status: message.status || msg.status,
              read: message.read !== undefined ? message.read : msg.read,
              isSent: message.isSent !== undefined ? message.isSent : msg.isSent,
              isError: message.isError !== undefined ? message.isError : msg.isError,
              isDeleted: message.isDeleted !== undefined ? message.isDeleted : msg.isDeleted,
              isDownload: message.isDownload !== undefined ? message.isDownload : msg.isDownload,
              file_name: message.file_name || msg.file_name,
              file_type: message.file_type || msg.file_type,
              file_size: message.file_size !== undefined ? message.file_size : msg.file_size,
              thumbnail: message.thumbnail || msg.thumbnail,
              file_path: message.file_path || msg.file_path,
              encryptedMessage: message.encryptedMessage || msg.encryptedMessage,
              encryptedAESKey: message.encryptedAESKey || msg.encryptedAESKey,
              eniv: message.eniv || msg.eniv,
              isReplyTo: message.isReplyTo ?? msg.isReplyTo
            };
          }
          return msg;
        });
  
        // Save updated messages back to localStorage
        globalThis.storage.setItem('messages', JSON.stringify(updatedMessages));

  
        //console.log("Updated message in localStorage:", message);
      } catch (err) {
        console.error("Error updating message in localStorage:", err);
      }
    } else {
      console.error("Unsupported platform");
    }
  };
  
const toggleEmojiPicker = () => {
    setShowEmojiPicker((prev) => !prev);
};

const toggleMute = () => {
  const mutedUsers = globalThis.storage.readJSON('mutedUsers', []) || [];



  if (mutedUsers && mutedUsers.includes(userdetails.id)) {
    // Unmute

    
    const updated = mutedUsers.filter(id => id !== userdetails.id);
    globalThis.storage.setItem('mutedUsers', JSON.stringify(updated));
    setmutedList(prev => prev.filter(id => id !== userdetails.id));
    setIsMuted(false);
  } else {
    // Mute
    mutedUsers.push(userdetails.id);
    globalThis.storage.setItem('mutedUsers', JSON.stringify(mutedUsers));
    setmutedList(prev => prev.filter(id => id !== userdetails.id));
    setIsMuted(true);
  }
};
const sound = customSounds.find(item => item.senderId === userdetails.id);



// const displayedImages = localchat_messages.current && localchat_messages.current.filter((msg) => msg.file_type === "image")
// .current.filter((msg) => msg.file_type === "image")
// .slice(0, 10);

const handleViewAll = () => {
setShowAll(true); // Navigate to Media Section
};

// Helper to pick a file (sound file) using HTML input
// --- Helper to pick an audio file using your native picker ---
// Picks a single audio file using native Android picker
function pickAudioFile() {
  return new Promise((resolve, reject) => {
    try {
      // Event listener for the custom event from native side
      const handleAudioSelected = async (event) => {
        window.removeEventListener('AudioSelected', handleAudioSelected);
        const { name, type, preview } = event.detail || {};

        if (!name || !preview) {
          reject("Invalid audio data from native picker");
          return;
        }

        try {
          const fileName = `${Date.now()}_${name}`;

          // Save to app sandbox Documents directory
          const savedFile = await Filesystem.writeFile({
            path: `files/userowned/audios/${fileName}`,
            data: preview.split(',')[1], // remove data:audio/mp3;base64,
            directory: Directory.Documents,
            recursive: true,
          });

          resolve({
            nativePath: savedFile.uri,
            fileName,
            savedPath: savedFile.uri,
            mimeType: type,
          });
        } catch (err) {
          console.error("❌ Error saving audio file:", err);
          reject(err);
        }
      };

      // Attach listener once
      window.addEventListener('AudioSelected', handleAudioSelected);

      // Trigger native picker
      console.log("🎧 Opening native audio picker...");
      window.NativeAds.pickAudioNative();
    } catch (err) {
      console.error("❌ Error starting native picker:", err);
      reject(err);
    }
  });
}

// --- unchanged helper, in case needed elsewhere ---
const convertBlobToBase642 = blob =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const handleRemoveCustomNotification = async () => {
  try {
    const senderId = userdetails.id;
    if (!senderId) {
      alert("Sender ID is required");
      return;
    }

    const confirmed = window.confirm("Are you sure you want to remove the custom sound?");
    if (!confirmed) return;

    setCustomSounds(prevSounds => {
      const existingSound = prevSounds.find(item => item.senderId === senderId);
      const updatedSounds = prevSounds.filter(item => item.senderId !== senderId);

      // Persist the updated sounds
      globalThis.storage.setItem('customSounds', JSON.stringify(updatedSounds));

      // Delete the audio file from permanent storage
      if (existingSound && existingSound.soundPath) {
        try {
          const uri = existingSound.soundPath.replace('file://', '');
          Filesystem.deleteFile({
            path: uri,
          })
            .then(() => console.log("✅ Deleted custom sound file:", uri))
            .catch(err => console.warn("⚠️ Could not delete file:", err));
        } catch (err) {
          console.error("❌ Error deleting file from storage:", err);
        }
      }

      return updatedSounds;
    });

    alert('✅ Custom notification sound removed successfully!');
  } catch (error) {
    console.error('❌ Error removing custom notification:', error);
    alert('❌ Failed to remove custom notification sound.');
  }
};

const handleCustomNotification = async () => {
  try {
    const file = await pickAudioFile();
    if (!file) return;

    const { savedPath, fileName } = file;
    const senderId = userdetails.id;
    if (!senderId) {
      alert("Sender ID is required");
      return;
    }

    setCustomSounds(prevSounds => {
      const updatedSounds = [...prevSounds];
      const existingIndex = updatedSounds.findIndex(item => item.senderId === senderId);

      // 🗑️ If an old sound exists, delete it before replacing
      if (existingIndex !== -1 && updatedSounds[existingIndex].soundPath) {
        const oldSoundPath = updatedSounds[existingIndex].soundPath;
        try {
          const uri = oldSoundPath.replace('file://', '');
          Filesystem.deleteFile({ path: uri ,directory: Directory.Documents})
            .then(() => console.log("🧹 Deleted old custom sound:", uri))
            .catch(err => console.warn("⚠️ Could not delete previous file:", err));
        } catch (err) {
          console.error("❌ Error deleting previous file:", err);
        }

        // Replace existing record
        updatedSounds[existingIndex] = { senderId, soundPath: savedPath, fileName };
      } else {
        // Push new record
        updatedSounds.push({ senderId, soundPath: savedPath, fileName });
      }

      // Persist updates
      globalThis.storage.setItem('customSounds', JSON.stringify(updatedSounds));

      return updatedSounds;
    });

    alert('✅ Custom notification sound set successfully!');
  } catch (error) {
    console.error('❌ Error handling custom notification:', error);
    alert('❌ Failed to set custom notification sound.');
  }
};


const handleCall = () =>{

}
const addEmoji = (emoji) => {
    setNewMessage((prevMessage) => prevMessage + emoji.native); // Add the selected emoji to the message input
};

const handleFileDownload = async (message) => {
  if (message.isDownload !== 0) return;

  console.log("📥 Downloading file: 4", JSON.stringify(message, null, 2));

  try {
    // ---- UI State updates ----
   // setDownloading((prev) => ({ ...prev, [message.id]: true }));
    setLoadingMessages((prev) => ({ ...prev, [message.id]: true }));
    setisDownloading((prev) => ({ ...prev, [message.id]: true }));

    if (Capacitor.isNativePlatform()) {
      // 🧠 Determine folder by type
      const isVideo = message.file_type?.startsWith("video/");
      const folderName = isVideo ? "Swipe_Videos" : "Swipe_Images";
    const baseDir = Directory.Documents;

      // 🗂️ Ensure subfolder exists
      try{
      await Filesystem.mkdir({
        directory: baseDir,
        path: folderName,
        recursive: true,
      });
    }catch(e){
console.log("direclry esit maybe",JSON.stringify(e,null,2))
    }
  // 2️⃣ Download file directly into that folder
  const result = await Filesystem.downloadFile({
    url: message.file_path,
    directory: baseDir, // shared area
    path: `${folderName}/${message.file_name}`,
  });

  console.log("✅ Download complete:", result.path);

  // 3️⃣ Get URI (for showing or saving to DB)

  const updatedMessage = {
    ...message,
    isDownload: 1,
    isError: 0,
    file_path: result.path,
    thumbnail: null,
  };
      setMessages1((prev) =>
        prev.map((msg) => (msg.id === message.id ? updatedMessage : msg))
      );
      localchat_messages.current = localchat_messages.current.map((msg) =>
        msg.id === message.id ? updatedMessage : msg
      );
      messagesRef.current = messagesRef.current.map((msg) =>
        msg.id === message.id ? updatedMessage : msg
      );

      await updateMessageForSent(updatedMessage);

      // ✅ Optional: trigger gallery scan (if you want it visible)
      // if (Capacitor.getPlatform() === "android" && window.MediaScannerPlugin?.scanFile) {
      //   window.MediaScannerPlugin.scanFile(uri);
      // }
    }

    // ---- Web fallback ----
    else {
      console.log("💻 Using fetch() for browser download");
      const response = await fetch(message.file_path);
      if (!response.ok) throw new Error(`File download failed: ${response.status}`);
      const blob = await response.blob();

      const fileActualPath = await saveFileToExternalStorage(
        blob,
        message.file_name,
        message.file_type
      );

      const updatedMessage = {
        ...message,
        isDownload: 1,
        isError: 0,
        file_path: fileActualPath,
        thumbnail: null,
      };

      setMessages1((prev) =>
        prev.map((msg) => (msg.id === message.id ? updatedMessage : msg))
      );
      localchat_messages.current = localchat_messages.current.map((msg) =>
        msg.id === message.id ? updatedMessage : msg
      );
      messagesRef.current = messagesRef.current.map((msg) =>
        msg.id === message.id ? updatedMessage : msg
      );

      await updateMessageForSent(updatedMessage);
    }

    // ---- Cleanup ----
  //  setDownloading((prev) => ({ ...prev, [message.id]: false }));
    setTimeout(() => {
      setLoadingMessages((prev) => ({ ...prev, [message.id]: false }));
      setisDownloading((prev) => ({ ...prev, [message.id]: false }));
    }, 2000);
  } catch (error) {
    console.error("❌ Error downloading file:", error);

    const failedMessage = { ...message, isDownload: 0, isError: 1 };

    setMessages1((prev) =>
      prev.map((msg) => (msg.id === message.id ? failedMessage : msg))
    );
    localchat_messages.current = localchat_messages.current.map((msg) =>
      msg.id === message.id ? failedMessage : msg
    );

    await updateMessageForSent(failedMessage);

  //  setDownloading((prev) => ({ ...prev, [message.id]: false }));
    setFileDownloadError(true);
    setTimeout(() => {
      setLoadingMessages((prev) => ({ ...prev, [message.id]: false }));
      setisDownloading((prev) => ({ ...prev, [message.id]: false }));
    }, 2000);
  }
};


      const formatTime = (time) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
      };

     
      
      const updateMessage = (id, updates) => {
        return new Promise((resolve, reject) => {
          if (!id || !updates || Object.keys(updates).length === 0) {
            reject(new Error('Invalid parameters: `id` and `updates` are required.'));
            return;
          }
      
          if (Platform.OS === 'web') {
            try {
              const stored = globalThis.storage.getItem('messages');
              let messages = stored ? JSON.parse(stored) : [];
      
              const index = messages.findIndex((msg) => msg.id === id);
              if (index === -1) {
                reject(new Error('Message not found in globalThis.storage.'));
                return;
              }
      
              messages[index] = { ...messages[index], ...updates };
              globalThis.storage.setItem('messages', JSON.stringify(messages));
              resolve(messages[index]);
            } catch (err) {
              reject(err);
            }
          } else {
            // Native platforms (e.g. Android/iOS) using SQLite
            const fields = Object.keys(updates)
              .map((key) => `${key} = ?`)
              .join(', ');
            const values = Object.values(updates);
      
            const query = `UPDATE messages SET ${fields} WHERE id = ?`;
      
            db.transaction(
              (tx) => {
                tx.executeSql(
                  query,
                  [...values, id],
                  (_, result) => resolve(result),
                  (_, error) => reject(error)
                );
              },
              (error) => reject(error)
            );
          }
        });
      };
      

function encryptWithAES(message, aesKey) {
  const iv = forge.random.getBytesSync(16);
  const cipher = forge.cipher.createCipher('AES-CBC', aesKey);
  cipher.start({ iv });
  cipher.update(forge.util.createBuffer(message, 'utf8'));
  cipher.finish();
  return {
    iv,
    ciphertext: cipher.output.getBytes()
  };
}

function encryptAESKeyWithRSA(aesKey, publicKeyPem) {
  const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
  const encrypted = publicKey.encrypt(aesKey, 'RSA-OAEP');
  return forge.util.encode64(encrypted);
}

    const generateMessageId = (userId) => {
//console.log(userId)
      const shortUuid = nanoid(4);

      // Get the current date in YYMMDDHHMM format
      const currentDate = new Date();
      const iso = currentDate.toISOString();
      const formattedDate = iso.replaceAll('-', '').replaceAll(':', '').replaceAll('T', '').slice(0, 12);


      // Combine nanoid, date, and userId
      return `${shortUuid}${formattedDate}-${userId.slice(-6)}`;
    };

    const sendMessage = async (e) => {
      e.preventDefault();  
      if (newMessage.trim() === '') return;
    
      const idd = generateMessageId(user._id);
      const timestamp = new Date().toISOString();
    
      // 1. Local message object with isError defaulting to 0
      const messageDatalocal = {
        type: 'messages',
        id: idd,
        sender: user._id,
        recipient: userdetails.id,
        content: newMessage,
        isReplyTo: replyTargetMessage?.id || null,
        timestamp,
        status: 'pending',
        read: 0,
        isDeleted: 0,
        isDownload: 0,
        file_name: null,
        file_type: null,
        file_size: null,
        thumbnail: null,
        file_path: null,
        isError: 0,
        encryptedMessage: '',
        encryptedAESKey: '',
        eniv:''
        
        

      };

      console.log("new message",newMessage)
      console.log("userdetails",userdetails)
const encrptedtext = await encryptMessageHybrid(newMessage, userdetails.publicKey);
 
      try {
        // 2. Prepare and send WS message (no isError here)
        const messageData = {
          ...messageDatalocal,
          messageId: idd, // for WebSocket
          Megtype: 'text',
          encryptedMessage: encrptedtext.ciphertext,
          encryptedAESKey: encrptedtext.encryptedAesKey,
          eniv:encrptedtext.iv,
          isReplyTo: replyTargetMessage?.id || null
          
        };
        delete messageData.id; // not used in ws
        delete messageData.isError;
    
       const resuke = await  saveMessage(messageData); // <-- Send via WebSocket


       if (resuke?.status === 'sent') {
        // 3. Mark local message as sent
        messageDatalocal.isSent = 1;
        messageDatalocal.isError = 0

      }
      else{
        messageDatalocal.isSent = 0 
        messageDatalocal.isError = resuke.message.isError
      }
        //console.log("✅ Message sent to WebSocket");
    
      } catch (err) {
        console.error("❌ Failed to send message:", err);
    
        // 3. Mark local message as failed
        messageDatalocal.isError = 1;
      }
    
      // 4. Save local regardless (state + ref)
      setMessages1(prev => [...prev, messageDatalocal]);
      
   
      // 5. Clear input
      setNewMessage('');
      setReplyTargetMessage(null);
      scrollToMessages();
    };
    

    const handleBackButton = () => {
    selectedUser.current = null
        history.push('/');
    };



// Helper to convert PEM public key string to ArrayBuffer
function pemToArrayBuffer(pem) {
  const b64 = pem
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s+/g, '');
  const binaryString = atob(b64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Helper: convert ArrayBuffer to base64 string
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

// Main hybrid encryption function
async function encryptMessageHybrid(newMessage, recipientPublicKeyPem) {
  // 1. Import the RSA public key
  const publicKeyBuffer = pemToArrayBuffer(recipientPublicKeyPem);
  const publicKey = await window.crypto.subtle.importKey(
    "spki",
    publicKeyBuffer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"]
  );

  // 2. Generate a random AES-GCM key
  const aesKey = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  // 3. Generate a random IV (12 bytes is recommended for AES-GCM)
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // 4. Encrypt the message using AES-GCM with the generated key and IV
  const encodedMessage = new TextEncoder().encode(newMessage);
  const encryptedMessageBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    encodedMessage
  );

  // 5. Export the AES key as raw bytes (to encrypt with RSA)
  const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey);

  // 6. Encrypt the AES key with the recipient's RSA public key
  const encryptedAesKeyBuffer = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    rawAesKey
  );

  // 7. Convert all parts to base64 strings for easy storage/transmission
  return {
    encryptedAesKey: arrayBufferToBase64(encryptedAesKeyBuffer),
    iv: arrayBufferToBase64(iv.buffer),
    ciphertext: arrayBufferToBase64(encryptedMessageBuffer),
  };
}

 const handleEmojiClick = (emojiData) => {
    setNewMessage((prev) => prev + emojiData.emoji);
  };

// file handling   ///////////////////////////////////////////////////////////////////////////
  const handleMediaSelect = (e) => {
    //console.log("media selected version 2",e.target.files)
    const files = Array.from(e.target.files);
    if (!files.length) return;
    // Cleanup old object URLs
    previewObjectUrlsRef.current.forEach((url) => {
      try { URL.revokeObjectURL(url); } catch {}
    });
    previewObjectUrlsRef.current = [];
    // Map to clean file objects with only desired fields
    const cleanedFiles = files.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      path: file.path || '',  // optional, if you have this custom prop
      preview: file.preview,       // base64 (if provided by native picker)
      previewUrl: (() => {
        const raw = file.preview;
        if (typeof raw === "string" && raw.startsWith("data:")) return raw;
        if (file instanceof Blob) {
          const url = URL.createObjectURL(file);
          previewObjectUrlsRef.current.push(url);
          return url;
        }
        return raw || "";
      })(),
    }));

  setMediaFiles(cleanedFiles);     // Cleaned array with minimal info
  //setSelectedMedia(cleanedFiles[0]);  // Start with first cleaned file
 // setShowPreview(true);
  setShowMediaPreview(true);
    setActiveMediaIndex(0);
    previewref.current = true;     // Show fullscreen preview
  };

  useEffect(() => {
    return () => {
      previewObjectUrlsRef.current.forEach((url) => {
        try { URL.revokeObjectURL(url); } catch {}
      });
      previewObjectUrlsRef.current = [];
    };
  }, []);

const toggleFileOptions = () => {
  setShowFileOptions(!showFileOptions);
};

const handleFileSelection = (e) => {
  const files = Array.from(e.target.files);
  
  const nonMediaFiles = files.filter(
      file => !file.type.startsWith("image/") && !file.type.startsWith("video/")
  );  if (!files.length) return;
  // Map to clean file objects with only desired fields
  const cleanedFiles = files.map(file => ({
    name: file.name,
    size: file.size,
    type: file.type,
    path: file.path || '',  // optional, if you have this custom prop
    fileObject: file,       // keep reference to native File if needed for upload
  }));
  
  if (cleanedFiles.length > 0) {
      processFilesSequentially(cleanedFiles);
  }
};

const processFilesSequentially = async (files) => {
  const token = await getAccessToken();
 
  for (const file of files) {
   //  console.log(":we are right here processFilesSequentially ",JSON.stringify(file, null, 2));
      await handleFileProcess(file,token); // This can be sending/uploading
  }
};


const classifyFileType = (file) => {
  const mimeType = file.type; // e.g. 'image/jpeg', 'video/mp4', 'application/pdf'
  const [mainType, subType] = mimeType.split('/');

  if (mainType === 'image') {
    return 'image';
  }

  if (mainType === 'video') {
    return 'video';
  }

  if (mainType === 'audio') {
    return 'audio';
  }

  return mimeType; // e.g. 'application/pdf', 'text/plain'
};


const waitForResult = (fnPromise, label) => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await fnPromise;
      if (!result) {
        console.warn(`⚠️ ${label} returned null, waiting aborted`);
        return reject(new Error(`${label} failed`));
      }
      console.log(`✅ ${label} done`);
      resolve(result);
    } catch (err) {
      console.error(`❌ ${label} error:`, err);
      reject(err);
    }
  });
};

const handleFileProcess = (file, token) => {
  const messageId = generateMessageId(user._id);
  const timestamp = new Date().toISOString();

  // Save file permanently first
  waitForResult(saveFilePermanently(file), 'saving file')
    .then(permanentFile => {
      file.path = permanentFile.path;

      const baseMessage = {
        id: messageId,
        sender: user._id,
        recipient: userdetails.id,
        content: null,
        timestamp,
        status: "pending",
        read: 0,
        isDeleted: 0,
        type: "file",
        file_name: file.name,
        file_type: ['image', 'video', 'audio'].includes(file.type.split('/')[0])
          ? file.type.split('/')[0]
          : file.type,
        file_size: file.size,
        isError: 0,
        isSent: 0,
        dueWifi: false
      };

      const localMessage = {
        ...baseMessage,
        isDownload: 1,
        file_path: file.path,
        thumbnail: null,
        encryptedMessage: '',
        encryptedAESKey: '',
      };

      const wsMessage = { ...localMessage, isDownload: 0, file_path: null };

      // Optimistic UI
      setMessages(prev => [...prev, localMessage]);
      messagesRef.current = [...messagesRef.current, localMessage];
  //    setUploadingFiles(prev => ({ ...prev, [file.name]: true }));
      setLoadingMessages(prev => ({ ...prev, [messageId]: true }));
      setisDownloading(prev => ({ ...prev, [messageId]: true }));

      console.log("⏳ Starting upload...");

      // ---- Step 1: Upload File ----
      return waitForResult(uploadFile(file, token), 'uploading file')
          .then(signedUrl => {
            if (!isValidUploadResult(signedUrl)) throw new Error("Upload returned invalid URL");
            const uploadUrl = getUploadUrl(signedUrl);
            console.log("✅ Upload complete:", uploadUrl);

            wsMessage.file_path = uploadUrl;

          // ---- Step 2: If image/video → Generate Thumbnail ----
          if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
            console.log("🧩 Generating thumbnail...");
            return waitForResult(generateCompressedPreview(file), 'generate thumbnail')
              .then(thumbBlob => {
                wsMessage.thumbnail = thumbBlob?.preview || null;
                localMessage.thumbnail = thumbBlob?.preview || null;
                return { signedUrl, wsMessage, localMessage };
              });
          }

          // For other file types (audio, pdf, etc.)
          return { signedUrl, wsMessage, localMessage };
        })
        // ---- Step 3: Send Message ----
        .then(({ wsMessage, localMessage }) => {
          console.log("📤 Sending WebSocket message:", wsMessage);
          return waitForResult(saveMessage(wsMessage), 'sending message')
            .then(result => {
              if (result?.status === "sent") {
                localMessage.isSent = 1;
                localMessage.isError = 0;
              } else {
                localMessage.isSent = 0;
                localMessage.isError = 1;
              }
              return localMessage;
            });
        })
        // ---- Step 4: Finalize & Update UI ----
        .then(async localMessage => {
          try {
            await storeMessageInSQLite(db, localMessage);
          } catch (e) {
            console.warn("⚠️ SQLite save failed:", e);
          }

          setMessages(prev => [
            ...prev.filter(m => m.id !== messageId),
            localMessage,
          ]);
          messagesRef.current = messagesRef.current.map(m =>
            m.id === messageId ? localMessage : m
          );

     
          setLoadingMessages(p => ({ ...p, [messageId]: false }));
          setisDownloading(p => ({ ...p, [messageId]: false }));

          scrollToMessages?.();
          console.log(`✅ Done: ${file.name}`);
        })
        // ---- Step 5: Handle Any Error ----
        .catch(async err => {
          console.error(`❌ Error processing ${file.name}:`, err);
          const failedLocal = {
            ...wsMessage,
            isError: 1,
            isSent: 0,
          };
          setFileUploadError(true);
          try {
            await storeMessageInSQLite(db, failedLocal);
          } catch (e) {
            console.warn("⚠️ SQLite save failed on error:", e);
          }

          setMessages(prev => [
            ...prev.filter(m => m.id !== messageId),
            failedLocal,
          ]);
          messagesRef.current = messagesRef.current.map(m =>
            m.id === messageId ? failedLocal : m
          );

         
          setLoadingMessages(p => ({ ...p, [messageId]: false }));
          setisDownloading(p => ({ ...p, [messageId]: false }));

          scrollToMessages?.();
        });
    });
};



function convertBlobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    // When the reader has finished reading the blob
    reader.onloadend = () => {
      // Resolve the promise with the Base64-encoded string
      resolve(reader.result);
    };

    // If there was an error reading the blob
    reader.onerror = (error) => {
      reject(error);
    };

    // Start reading the blob as a data URL (Base64)
    reader.readAsDataURL(blob);
  });
}

const saveFilePermanently = async (file) => {
  try {
    const isVideo = file.type.startsWith('video/');
    const folder = isVideo ? 'files/userowned/videos' : 'files/userowned/images';

    // Use timestamp + original name to avoid collisions
    const fileName = `${Date.now()}_${file.name}`;

    const savedFile = await Filesystem.writeFile({
      path: `${folder}/${fileName}`,
      data: file.preview.split(',')[1], // base64
      directory: Directory.Documents, // persistent storage
      recursive: true, // create subfolders if they don't exist
    });
console.log("sve that shit with id ",savedFile.uri);
    // Return the file object with updated path
    return {
      ...file,
      path: savedFile.uri, // this is now the permanent path
    };
  } catch (err) {
    console.error('❌ Error saving file permanently:', err);
    return file; // fallback to original
  }
};

const uploadFile = async (file, token) => {
  try {
    console.log("🚀 Upload initiated for:", file.name);
    console.log("📁 Full file object:", JSON.stringify(file, null, 2));

    // 🔹 Get Uint8Array directly
    const uint8View = await getBlobFromSandboxPath(file.path);

    console.log(
      "✅ Uint8Array ready for upload:",
      "Length:", uint8View.length,
      "First 20 bytes:", Array.from(uint8View.slice(0, 20)).join(', ')
    );

    // 🔹 Send binary data directly to API
    const host = `https://${Maindata.SERVER_URL}`;
    const response = await authFetch(
      `${host}/messages/upload-to-b2`,
      {
        method: 'POST',
        headers: {
          'X-Filename': file.name,
          'X-Filesize': file.size?.toString() || uint8View.length.toString(),
          'Content-Type': 'application/octet-stream',
        },
        body: uint8View,
      },
      host
    );

    // 🔹 Handle upload result
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Upload failed: ${response.status} - ${errorText}`);
      return null;
    }

    const result = await response.json();
    console.log("✅ Upload success:", JSON.stringify(result, null, 2));

    return {
      fileId: result.fileId,
      fileName: result.fileName,
      fileUrl: result.fileUrl,
    };
  } catch (error) {
    console.error('🚨 Error uploading file:', error.message, error);
    return null;
  }
};




const getBlobFromSandboxPath = async (path) => {
  try {
    // 1️⃣ Clean the URI prefix
    const cleanPath = path.replace('file://', '');

    let fileData;

    // 2️⃣ Detect if path is inside app's sandbox
    if (cleanPath.includes('/Documents/')) {
      const relativePath = cleanPath.split('/Documents/')[1];
      fileData = await Filesystem.readFile({
        path: relativePath,
        directory: Directory.Documents,
      });
    } else {
      // Absolute shared path (outside Capacitor sandbox)
      fileData = await Filesystem.readFile({
        path: cleanPath,
      });
    }

    // 3️⃣ Convert base64 → Uint8Array
    const byteCharacters = atob(fileData.data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);

     console.log(
      "🟢 Uint8Array length:", byteArray.length,
      "\n🟢 First 20 bytes:", Array.from(byteArray.slice(0, 20)).join(', '),
      "\n🟢 Hex preview:", Array.from(byteArray.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' ')
    );
    return byteArray; // return it in case you want to upload later
  } catch (err) {
    console.error('❌ Error reading file as Uint8Array:', err);
    throw err;
  }
};


const generateCompressedPreview = async (file) => {
  console.log("we at generate compressed view");

  try {
    if (file.type.startsWith('image/')) {
      // Get base64 from sandbox
 const byteArray = await getBlobFromSandboxPath(file.path);

// Convert Uint8Array → base64
let binary = '';
const chunkSize = 0x8000;
for (let i = 0; i < byteArray.length; i += chunkSize) {
  const chunk = byteArray.subarray(i, i + chunkSize);
  binary += String.fromCharCode.apply(null, chunk);
}
const base64 = btoa(binary);

// Ensure proper prefix
const prefixedBase64 = `data:${file.type};base64,${base64}`;


      // Try compressing
      const compressedBase64 = await compressBase64Image(prefixedBase64, 0.7, 0.8);

      // 🟡 Fallback if compression failed
      const preview = compressedBase64 || prefixedBase64;

      return { type: 'image', preview };

    } else if (file.type.startsWith('video/')) {
      const thumbnailBlob = await generateThumbnail(file);
      if (!thumbnailBlob) return null;

      const compressedBase64 = await compressBase64Image(thumbnailBlob, 0.7, 0.8);
      const preview = compressedBase64 || thumbnailBlob;

      return { type: 'video', preview };
    }

    return null;
  } catch (err) {
    console.error('Error generating preview:', err);
    return null;
  }
};
  const pickerRef = useRef(null);
  const buttonRefemoji = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target ) &&
        buttonRefemoji.current &&
        !buttonRefemoji.current.contains(event.target )
      ) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    // cleanup
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmojiPicker]);

 const compressBase64Image = async (base64Str, quality = 0.7, opacity = 1.0) => {
  return new Promise((resolve) => {
    try {
      // Validate base64 format
      if (!base64Str || typeof base64Str !== 'string') {
        console.error('Invalid base64 string');
        return resolve(null);
      }

      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1080; // limit size to avoid GPU errors
          let { width, height } = img;

          if (width > MAX_WIDTH) {
            height = (height * MAX_WIDTH) / width;
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.globalAlpha = opacity;
          ctx.drawImage(img, 0, 0, width, height);

          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        } catch (e) {
          console.error('Compression error:', e);
          resolve(null);
        }
      };

      img.onerror = (err) => {
        console.error('Image load failed for compression:', err);
        resolve(null);
      };

      // Safety: defer setting src to next event loop
      setTimeout(() => {
        img.src = base64Str;
      }, 10);

    } catch (err) {
      console.error('compressBase64Image outer error:', err);
      resolve(null);
    }
  });
};

const generateThumbnail = async (file) => {
  const folder = 'thumbnails';
    const thumbnailFileName = `${file.name}_${file.size}_thumb.jpg`;
    const fullPath = `${folder}/${thumbnailFileName}`;
      try {
    
    
          const existing = await Filesystem.readFile({
            path: fullPath,
            directory: Directory.Cache,
          });
    
          //console.log('Existing thumbnail found:', existing);
          return `data:image/jpeg;base64,${existing.data}`;
        } catch {
          //console.log('Thumbnail not found, generating new one...');
        }
           const result = await ffmpeg_thumnail.generateThumbnail({ path: file.path });
            const base64Thumbnail = result.data;
        
            if (!base64Thumbnail) {
              throw new Error('No thumbnail data returned by plugin.');
            }
        
            // Step 3: Save the thumbnail to cache
            await Filesystem.writeFile({
              path: fullPath,
              data: base64Thumbnail,
              directory: Directory.Cache,
              recursive: true,
            });
        
            // Step 4: Return the base64 data URL
            return `data:image/jpeg;base64,${base64Thumbnail}`;
};



const handleClosePreview = () => {
  //setShowPreview(false);
  setShowMediaPreview(false);
  processFilesSequentially(mediaFiles);
  setMediaFiles([]);
  
  
};

/*************  ✨ Windsurf Command 🌟  *************/
// Handle file upload logic (triggered when files are selected)

    const handleVideoClick = (message) => {
      //console.log("clicked")
      setPreviewVideo(message.file_path? message : "https://www.w3schools.com/html/mov_bbb.mp4"); // Set the video for fullscreen view
    };
  
    const closeVideoPreview = () => {
   
      setPreviewVideo(null); // Close fullscreen view
      history.push("/")
    };
  
 

    const handleImageClick = (imagePath) => {

      if(selectionMode){
        return
      }
      //console.log("clicked")
      if(selectionModeFile){
        return;
      }
      setFullscreenImage(imagePath); // Open image in fullscreen
    };
  
    const closeImageFullscreen = () => {
      //console.log("closed")
     setFullscreenImage(null); // Close fullscreen modal
    };
    const handleFullScreenImage = (image) => {
      setFullscreenImage(image);
    };
    const readFiles = ((file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            name: file.name,
            size: file.size,
            type: file.type,
            path: file.webkitRelativePath || file.name, // Path (for webkit browsers)
            binary: reader.result, // Base64 string
          });
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file); // Reads file as Base64
      });
    });

    const getBase64FromPath = async (filePath) => {
  try {
    const cleanPath = filePath.replace('file://', '');
    const file = await Filesystem.readFile({ path: cleanPath });
    return file.data; // base64 string without data: prefix
  } catch (err) {
    console.error('Error reading file for base64:', err);
    return null;
  }
};

// const handleImage = (imagePath) => {
//   if(window.Capacitor.getPlatform() === "android"){
 
//     // For video or docs just return path (or convert if needed)
//     return imagePath.file_path;
//   }else{
//     return imagePath.fileData
//   }// Open image in fullscreen
// };
const HandleBigimage = (img)=>{
  if(window.Capacitor.getPlatform() === "android"){
    return img.file_path
  }else{
    return img.fileData
  }
}

  const discordColors = {
    background: "#E5E7EB",
    bubbleYou: "#3B82F6",
    bubbleOther: "#2B2D31",
    textPrimary: "#FFFFFF",
    textusersEpanded:"rgb(43, 45, 49)",
    accent: "#10B981",
  }

  const lightColors = {
    background: "#FFFFFF",
    bubbleYou: "linear-gradient(135deg, #6366F1, #8B5CF6)",
    bubbleOther: "#F1F5F9",
    textPrimary: "#0F172A",
        textusersEpanded:"#ffffff",
    accent: "#C084FC",
  }

  const colors = isDarkMode ? discordColors : lightColors
const handleArchive = () => {
  //console.log("Archive button clicked");

  let usersMain = globalThis.storage.readJSON("usersMain", null) || [];

  // Update the archive status for the specific user
  const updatedUsers = usersMain.map(user => {
    if (user.id === userdetails.id) {
      const currentArchiveStatus = user.isArchive || false; // Default to false if undefined
      const updatedUser = { ...user, isArchive: !currentArchiveStatus }; // Toggle archive status
   userdetails.isArchive = !currentArchiveStatus;
      // If the user is being archived, mute them. If unarchiving, unmute them.
      if (!currentArchiveStatus) {
        // Archiving user, mute them
        updatedUser.isMuted = true;
        
      } else {
        // Unarchiving user, unmute them
        updatedUser.isMuted = false;
       
      }

      return updatedUser;
    }
    return user;
  });

  // Update muted list state
  setmutedList(prevMutedUsers => {
    let updatedMutedUsers = [...prevMutedUsers];

    if (updatedUsers.find(user => user.id === userdetails.id).isMuted) {
      // If the user is muted, add to muted users list
      if (!updatedMutedUsers.includes(userdetails.id)) {
        updatedMutedUsers.push(userdetails.id);
        setIsMuted(true);
      }
    } else {
      // If the user is unmuted, remove from muted users list
      updatedMutedUsers = updatedMutedUsers.filter(id => id !== userdetails.id);
      setIsMuted(false);

    }

    // Update localStorage with the updated muted users list
    globalThis.storage.setItem('mutedUsers', JSON.stringify(updatedMutedUsers));
    return updatedMutedUsers; // Return the updated muted users list
  });

  // Update localStorage with the updated usersMain list
  globalThis.storage.setItem("usersMain", JSON.stringify(updatedUsers));

  // Update the state to trigger re-render with the new users list
  setUsersMain(updatedUsers);

  // Toggle the archive status in your UI
  setIsarcivehs(prev => !prev);

  //console.log(`Toggled archive and mute status for user ${userdetails.id}`);
};

const persistBlockedUsers = (set) => {
  globalThis.storage.setItem('blockedUsers', JSON.stringify([...set]));
};


const handleBlock = async() => {
     if (!targetId) return;

  await blockUser(targetId);
};
const handleUnblock = async() =>{
   if (!targetId) return;

  await unblockUser(targetId);
}
 
const handleDeleteChat = () => {
  setShowModal(true);
  //console.log("Delete Chat button clicked");
};


const handleWipeChat = () => {
  //console.log("Wipe the chat completely");

  // Get userdetails from localStorage
 

  // Web (Browser)
  if (!isPlatform('web')) {
    //console.log("Web platform detected");

    // Remove the userMain from localStorage if the id matches
      let userMain = globalThis.storage.readJSON("usersMain", null);
 
  if (Array.isArray(userMain)) {
    // Filter out the user with matching ID
    userMain = userMain.filter(user => user.id !== userdetails.id);

    // Update localStorage
    globalThis.storage.setItem("usersMain", JSON.stringify(userMain));
    setUsersMain(userMain);
    // console.log("Removed matching user from usersMain array");
  } 



    // Get messages from localStorage and remove messages related to the current user
    let messages = globalThis.storage.readJSON("messages", null) || [];
    messages = messages.filter(msg => msg.sender !== userdetails.id && msg.recipient !== userdetails.id);
    globalThis.storage.setItem("messages", JSON.stringify(messages)); // Save the updated messages back to localStorage
    //console.log("Deleted messages related to the user from localStorage");
  }

  // Android (Hybrid)
  if (isPlatform('hybrid')) {
    // Get unread messages from localStorage
    let userMain = globalThis.storage.readJSON("usersMain", null);
 
  if (Array.isArray(userMain)) {
    // Filter out the user with matching ID
    userMain = userMain.filter(user => user.id !== userdetails.id);

    // Update localStorage
    globalThis.storage.setItem("usersMain", JSON.stringify(userMain));
     setUsersMain(userMain);
    // console.log("Removed matching user from usersMain array");
  } 

    // Get the IDs of unread messages to update them (assuming messageIds is an array of message IDs)
 const selectQuery = `
    SELECT id FROM messages
    WHERE sender = ? OR recipient = ?
  `;

  db.transaction(tx => {
    // Step 1: Fetch message IDs
    tx.executeSql(
      selectQuery,
      [userdetails.id, userdetails.id],
      (_, result) => {
        const idsToDelete = [];
        const rows = result.rows;

        for (let i = 0; i < rows.length; i++) {
          idsToDelete.push(rows.item(i).id);
        }

        if (idsToDelete.length === 0) {
          console.log("✅ No messages found for deletion.");
          return;
        }

        // Step 2: Send to backend

        // Step 3: Delete locally using those IDs
        deleteMessagesByIds(idsToDelete);
      },
      (_, error) => {
        console.error("❌ Error selecting messages:", error);
        return false;
      }
    );
  });

    localchat_messages.current = null;
    messagesRef.current = null;messagesRef.current = messagesRef.current?.filter(
  msg => msg.sender !== userdetails.id && msg.recipient !== userdetails.id
);
setMessages(previousMessages => previousMessages.filter(
  msg => msg.sender !== userdetails.id && msg.recipient !== userdetails.id
));
history.push('/');

    // Use the provided SQL logic for deleting from MySQL
   
  }
  
const deleteMessagesByIds = (ids) => {
  if (!ids.length) return;

  const placeholders = ids.map(() => '?').join(',');
  const deleteQuery = `
    DELETE FROM messages
    WHERE id IN (${placeholders})
  `;

  db.transaction(tx => {
    tx.executeSql(
      deleteQuery,
      ids,
      () => {
        console.log(`✅ Locally deleted ${ids.length} messages.`);
      },
      (_, error) => {
        console.error("❌ Error deleting messages by IDs:", error);
        return false;
      }
    );
  });
};

  // Close the modal after the action is completed
  setShowModal(false); // Close the modal
};

const handlePartialDelete = () => {
  // Get the current usersMain array from localStorage
  let usersMain = globalThis.storage.readJSON("usersMain", null) || [];

  // Update the matched user's isPartialDelete flag
  const updatedUsers = usersMain.map(user => {
    if (user.id === userdetails.id) {
      return { ...user, isPartialDelete: true };
    }
    return user;
  });

  // Save the updated array back into localStorage
  globalThis.storage.setItem("usersMain", JSON.stringify(updatedUsers));

  // Optionally update the state if you're storing usersMain in state too
  setUsersMain(updatedUsers);

  //console.log(`Marked user ${userdetails.id} as partially deleted`);

  setShowModal(false); // Close the modal
};
const handleCancel = () => {
  setShowModal(false); // Close the modal without any action
};
const getFilesByType = (type) => {
  //console.log("type",type)
  //console.log("localchat_messages.current",localchat_messages.current.filter((msg) => msg.file_type === type &&msg.isDownload ===1 ))
  return localchat_messages.current.filter((msg) => msg.file_type === type &&msg.isDownload ===1 );
};
const handleBack = () => {
  setShowAll(false);
};




const getSortedMessages = () => {

  const sortedMessages = [...localchat_messages.current]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); 

  return sortedMessages;
};

const truncateReplyText = (value, max = 80) => {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

const isImageType = (fileType) => String(fileType || "").toLowerCase().includes("image");
const isVideoType = (fileType) => String(fileType || "").toLowerCase().includes("video");

const getReplyPreviewMessage = (msg) => {
  const replyId = String(msg?.isReplyTo || "").trim();
  if (!replyId || !Array.isArray(localchat_messages.current)) return null;
  return localchat_messages.current.find((m) => String(m?.id || "") === replyId) || null;
};

const escapeSelectorValue = (value) =>
  String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');

const scrollToMessageById = (messageId) => {
  const id = String(messageId || "").trim();
  if (!id || !scrollRef.current) return;
  const node = scrollRef.current.querySelector(`[data-message-id="${escapeSelectorValue(id)}"]`);
  if (!node) return;
  node.scrollIntoView({ behavior: "smooth", block: "center" });
  setGlowMessageId(id);
  if (replyGlowTimeoutRef.current) clearTimeout(replyGlowTimeoutRef.current);
  replyGlowTimeoutRef.current = setTimeout(() => setGlowMessageId(null), 1800);
};

const getReplyBarLabel = (target) => {
  if (!target) return "";
  const fileType = target.file_type || target.fileType || "";
  if (isImageType(fileType)) return "Image";
  if (isVideoType(fileType)) return "Video";
  const text = String(target.content || "").trim() || "Message";
  return text.length > 90 ? `${text.slice(0, 89)}...` : text;
};

const getReplyBarMeta = (target) => {
  if (!target) return "";
  const isMine = String(target.sender || "") === String(user?._id || "");
  const senderName = isMine ? "You" : String(userdetails?.name || "User");
  const timeLabel = target?.timestamp
    ? new Date(target.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";
  return timeLabel ? `${senderName} • ${timeLabel}` : senderName;
};

const handleMessageTouchStart = (e, msg) => {
  const touch = e.touches?.[0];
  if (!touch || !msg?.id) return;
  handlePressStart(msg);
  swipeReplyRef.current = {
    activeId: String(msg.id),
    startX: touch.clientX,
    startY: touch.clientY,
    triggered: false,
  };
};

const handleMessageTouchMove = (e) => {
  const touch = e.touches?.[0];
  const state = swipeReplyRef.current;
  if (!touch || !state.activeId || state.triggered) return;
  const dx = touch.clientX - state.startX;
  const dy = Math.abs(touch.clientY - state.startY);
  if (dx < 62 || dy > 34) return;
  const target =
    localchat_messages.current?.find((m) => String(m?.id || "") === state.activeId) || null;
  if (!target) return;
  setReplyTargetMessage(target);
  swipeReplyRef.current = { ...state, triggered: true };
};

const handleMessageTouchEnd = () => {
  handlePressEnd();
  swipeReplyRef.current = {
    activeId: null,
    startX: 0,
    startY: 0,
    triggered: false,
  };
};

const renderReplyPreview = (msg) => {
  const target = getReplyPreviewMessage(msg);
  if (!target) return null;

  const fileType = target.file_type || target.fileType || "";
  const image = isImageType(fileType);
  const video = isVideoType(fileType);
  const previewSrc = target.thumbnail || target.file_path || "";
  const replyToCurrentUser = String(target.sender || "") === String(user?._id || "");
  const replySenderName = String(target.sender || "") === String(user?._id || "") ? "You" : String(userdetails?.name || "User");
  const previewText = image || video
    ? ""
    : truncateReplyText(target.content || `File: ${target.file_name || "media"}`, 72);

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        scrollToMessageById(target.id);
      }}
      style={{
        backgroundColor: replyToCurrentUser ? "#eef2f7" : "#4b8fe8",
        color: replyToCurrentUser ? "#1f2937" : "#fff",
        borderRadius: "8px",
        padding: "7px 9px",
        marginTop: "6px",
        width: "min(100%, 238px)",
        minHeight: "56px",
        maxHeight: "86px",
        overflow: "hidden",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.01em",
          opacity: 0.95,
          marginBottom: "3px",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {replySenderName}
      </div>
      {image && previewSrc ? (
        <ImageRenderer
          src={previewSrc}
          alt="reply preview"
          style={{
            width: "100%",
            maxWidth: "100%",
            height: "42px",
            maxHeight: "42px",
            objectFit: "cover",
            borderRadius: "6px",
            opacity: 0.85,
          }}
        />
      ) : null}
      {video && previewSrc ? (
        <VideoRenderer
          src={previewSrc}
          Name={target.file_name || target.id || "reply-video"}
          Size={Number(target.file_size || 0)}
          style={{
            width: "100%",
            maxWidth: "100%",
            height: "42px",
            maxHeight: "42px",
            aspectRatio: "16 / 9",
            objectFit: "cover",
            borderRadius: "6px",
            opacity: 0.85,
          }}
        />
      ) : null}
      {!image && !video ? (
        <div
          style={{
            fontSize: "12px",
            fontWeight: 600,
            marginTop: "0px",
            lineHeight: 1.2,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {previewText}
        </div>
      ) : null}
    </div>
  );
};
const handleDeselectAll = () => {
  // Call your function to deselect all users here
  setSelectionMode(false); // This will deactivate the selection mode
  setSelectedChats([]); // Clear the selected users
};
const handleMoreOptions = () => {
  setShowMoreOptions(prev => !prev);
};

const handleOptionClick = () => {
  //console.log(`${option} clicked.`);
  setShowMoreOptions(false); // Close menu after click
};
const getMimeTypeFromFileName = (fileName) => {
  const ext = fileName.split('.').pop().toLowerCase();
  switch (ext) {
    case 'pdf': return 'application/pdf';
    case 'txt': return 'text/plain';
    case 'doc': return 'application/msword';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'jpg': return 'image/jpg';
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    default: return 'application/octet-stream';
  }
};




const handleFileOpen = async (msg) => {


  const filePath = msg.file_path;
  const fileName = msg.file_name;

  if (!filePath) {
    alert('File path not found.');
    return;
  }

  const mimeType = getMimeTypeFromFileName(fileName);

  if (isPlatform('hybrid')) {
    try {
      if (filePath.startsWith('file://') || filePath.startsWith('content://')) {
        // Directly open file or content URI
        await FileOpener.openFile({
          path: filePath,
          mimeType,
        });
      } else if (filePath.startsWith('/data/')) {
        // Internal app storage path, read file and then open
        // Step 1: Read file via Capacitor Filesystem plugin
        // Remove your package path prefix if needed
        const relativePath = filePath.replace(/^\/data\/user\/0\/[^\/]+\/files\//, '');

        const file = await Filesystem.readFile({
          path: relativePath,
          directory: Directory.Data,
          encoding: 'base64',
        });

        // Step 2: Save the file temporarily so it can be opened by FileOpener or use a native method that can open base64 or blobs

        // Assuming you have a native method or plugin that accepts base64 or you write it to a cache folder and open it
        // Here is a simplified pseudo-step:
        const tempPath = await saveBase64ToTempFile(file.data, fileName);
        await FileOpener.openFile({
          path: tempPath,
          mimeType,
        });
      } else {
        // Other paths fallback
        await FileOpener.openFile({
          path: filePath,
          mimeType,
        });
      }
    } catch (error) {
      console.error('Error opening file in hybrid environment:', error);
      alert('Error opening file: ' + error.message);
    }
  } else {
    // Web fallback: open in browser or with a download link
    openFileInBrowser(msg);
  }
};


const openFileInBrowser = (msg) => {
  const blob = new Blob([msg.content], { type: getMimeTypeFromFileName(msg.fileName) });
  const fileURL = URL.createObjectURL(blob);
  window.open(fileURL, '_blank');
};

const handleFileClick = (file) => {
  // ✅ Prevent click logic if long press already happened

  // Normal click behavior
  if (selectionModeFile === false) {
    // Example: open image or preview
    console.log("this shoundl be runnig")
    handleImageClick(file.file_path);
    return;
  }
  if (longPressTriggered) return;

  // Toggle selection when already in selection mode
  setSelectedFiles((prev) => {
    const isAlreadySelected = prev.some((f) => f.id === file.id);
    const updatedSelection = isAlreadySelected
      ? prev.filter((f) => f.id !== file.id)
      : [...prev, file];

    if (updatedSelection.length === 0) setSelectionModeFile(false);

    return updatedSelection;
  });
};

const handleLongPress = (file) => {
  setSelectionModeFile(true);
  setSelectedFiles([file]);
};

const handleCancelSelection = () => {
  setSelectionModeFile(false);
  setSelectedFiles([]);
};

const LONG_PRESS_DURATION = 2000; // milliseconds
let pressTimer1 = null;
let longPressTriggered = false;

const handlePressStart1 = (msg) => {
  longPressTriggered = false;
  pressTimer1 = setTimeout(() => {
    longPressTriggered = true;
        handleLongPress(msg);

  }, LONG_PRESS_DURATION);
};

const handlePressEnd1 = () => {
  if (pressTimer1) {
    clearTimeout(pressTimer1);
    pressTimer1 = null;
  }
};
const deleteMessageFromWeb = (id)=>{
  console.log(id)
}
const handleForwardFiles = (selectedFiles) => () => {

  history.push('/forwardScreen', { forwardedMessages: selectedFiles });
}
const handleDeleteFiles = (selectedFiles) => async () => {
  try {
    // Extract message IDs
    const messageIds = selectedFiles.map(file => file.messageId);

    // 1. Delete from Web (Assuming API or IndexedDB)
    await Promise.all(messageIds.map(id => deleteMessageFromWeb(id)));

    // 2. Delete from Cordova SQLite
    messageIds.forEach(id => {
      db.transaction(tx => {
        tx.executeSql(
          'DELETE FROM messages WHERE id = ?',
          [id],
          () => //console.log(`Deleted message ${id} from SQLite`),
          (tx, error) => console.error(`SQLite delete error: ${error.message}`)
        );
      });
    });

    // 3. Remove from localChat state
      if (localchat_messages.current) {
      localchat_messages.current = localchat_messages.current.filter(
        msg => !messageIds.includes(msg.id)
      );
    }
    // 4. Remove from messageRef.current
    if (messagesRef.current) {
      messagesRef.current = messagesRef.current.filter(msg => !messageIds.includes(msg.id));
    }

    //console.log("Messages deleted successfully.");
  } catch (error) {
    console.error("Error deleting messages:", error);
  }
};


const handleResend = async (message ) => {
  //console.log("message",message)
  if(message.type === "file"){
  const updatedMessage = { ...message };
  const messageId = message.id;
const token = await getAccessToken();
  try {
  //  setUploadingFiles(prev => ({ ...prev, [message.file_name]: true }));
    setLoadingMessages(prev => ({ ...prev, [messageId]: true }));
    setisDownloading(prev => ({ ...prev, [messageId]: true }));


    const signedUrl = await uploadFile(message, token);
    const uploadUrl = getUploadUrl(signedUrl);

      if (!isValidUploadResult(signedUrl)) {
        throw new Error("❌ Invalid signed URL received during reprocessFileMessage");
      }

    // Generate thumbnail again if needed
 

    // Send the message via WebSocket
  updatedMessage.file_path = uploadUrl


  if(uploadUrl){
  const result = await saveMessage(updatedMessage);

    message.isSent = result?.status === 'sent' ? 1 : 0;
    message.isError = result?.message?.isError || 0;
}else{
  message.isError = 1;
  message.isSent = 0;
}
    
   

  } catch (err) {
    console.error(`❌ Error reprocessing file message: ${message.file_name}`, err);

    setFileUploadError(true)

  } finally {
    // Update state
    setMessages(prev => prev.map(m => m.id === messageId ? message : m));
    setMessagestest(prev => prev.map(m => m.id === messageId ? message : m));
    setMessages1(prev => prev.map(m => m.id === messageId ? message : m));
    messagesRef.current = messagesRef.current.map(m => m.id === messageId ? message : m);

    // Update storage
 updateMessageForSent(message);

    // Cleanup loading states
  
    setTimeout(() => {
      setLoadingMessages(prev => ({ ...prev, [messageId]: false }));
      setisDownloading(prev => ({ ...prev, [messageId]: false }));
  
    },2000)
  
    //console.log(`✅ Reprocessed file message: ${message.file_name}`);
  }
}
};
const handleVideoCall = () =>{

}
const introCreatedAt = userdetails?.updatedAt || userdetails?.timestamp || null;
const introAvatar = userdetails?.avatar || img;
const introName = userdetails?.name || userdetails?.phoneNumber || "Chat";
const introDescription = userdetails?.About || "Messages are end-to-end encrypted.";

// async function fetchFileFromPath(path) {
//   try {
//     // Read file content from the specified path
//     const file = await Filesystem.readFile({
//       path: path, // Example: 'folder/content' (relative to app's internal storage)
//       directory: Directory.Documents, // Choose appropriate directory (e.g., Documents, Data, External)
//       encoding: Encoding.UTF8, // You can adjust encoding based on your use case
//     });

//     // Convert base64 file data to a Blob
//     const byteCharacters = atob(file.data);
//     const byteArrays = [];
//     for (let offset = 0; offset < byteCharacters.length; offset++) {
//       byteArrays.push(byteCharacters.charCodeAt(offset));
//     }
//     const fileBlob = new Blob([new Uint8Array(byteArrays)]);

//     return fileBlob;
//   } catch (error) {
//     console.error("Failed to fetch file:", error);
//     throw error;
//   }
// }





    return (
        <div className="chat-window d-flex flex-column vh-100">
          { isloading && (

   <div style={{ textAlign: 'center',display: 'flex', justifyContent: 'center', alignItems: 'center',position: 'fixed', top: '50%', left: '50%', zIndex: 999999,transform: 'translate(-50%, -50%)',    background:' rgba(0, 0, 0, 0.5',height: '100vh',width:'100%',overflowY: 'auto' }}>
      <StarLoader />
   
    </div>
  
         ) }

            {/* Header with user details and Back Button */}
            {
  selectionMode ? (
    // Header for selection mode
      <div className="flex items-center justify-between w-full max-w-3xl px-4 py-2 relative bg-primary text-white" style={{ height: '70px' ,position:'fixed'}}>
    {/* Left: Back Button */}
    <div className="flex items-center space-x-3">
      <button
        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-white/20 z-10"
        title="Cancel Selection"
        onClick={(e) => {
          e.stopPropagation();
          handleDeselectAll();
        }}
      >
        <IonIcon icon={closeOutline} size="medium" />
      </button>

      <div className="ml-12 text-lg font-semibold">Selected</div>
    </div>

    {/* Right: Action Buttons */}
    <div className="flex items-center space-x-4">
      <button
        className="p-2 rounded-full hover:bg-white/20"
        onClick={handleCopy}
        title="Copy"
      >
        <IonIcon icon={copyOutline} size="small" />
      </button>

      <button
        className="p-2 rounded-full hover:bg-white/20"
        onClick={handleDelete}
        title="Delete"
      >
        <IonIcon icon={trashOutline} size="small" />
      </button>

      <button
        className="p-2 rounded-full hover:bg-white/20"
        onClick={handleForward}
        title="Forward"
      >
        <IonIcon icon={arrowRedoOutline} size="small" />
      </button>

      <div className="relative">
        <button
          className="p-2 rounded-full hover:bg-white/20"
          onClick={handleMoreOptions}
          title="More"
        >
          <IonIcon icon={ellipsisVerticalOutline} size="small" />
        </button>

        {showMoreOptions && (
          <div className="absolute top-12 right-0 bg-white text-black rounded shadow-lg z-10 w-40">
            <button
              className="block w-full text-left px-4 py-2 hover:bg-gray-100"
              onClick={() => handleOptionClick('Mark as Read')}
            >
              Mark as Read
            </button>
            <button
              className="block w-full text-left px-4 py-2 hover:bg-gray-100"
              onClick={handleArchive}
            >
              {isArchive ? 'Unarchive' : 'Move to Archive'}
            </button>
            <button
              className="block w-full text-left px-4 py-2 hover:bg-gray-100"
              onClick={() => handleOptionClick('Report')}
            >
              Report
            </button>
          </div>
        )}
      </div>
    </div>
  </div>

  ) : (
             <div
  className={`header  text-white d-flex items-center p-3 justify-between transition-all duration-300 ${isExpanded ? 'expanded' : ''}`}
  style={{ height: isExpanded ? '100vh' : '100px', overflow: isExpanded ? 'auto' : 'hidden',background: 'rgb(43, 45, 49)' }}
>
  {/* Back Button */}
 {isExpanded && <button
    className="p-2 rounded-full hover:bg-gray-200 absolute left-2 top-4"
    title="Back"
    onClick={toggleHeader }
    style={{ color:'black' }}
  >
    <IonIcon icon={arrowBackOutline} size="medium" />
  </button>}
 
  {isExpanded && (
        <>
          {/* Main Ellipsis Button */}
          <button
            className="p-2 rounded-full hover:bg-black-200 absolute right-2 top-4"
            title="Options"
            onClick={toggleOptions}
             style={{ color:'black' }}
          >
            <IonIcon icon={ellipsisVerticalOutline} size="medium" />
          </button>

          {/* Floating Options Dropdown */}
{showOptions && (
  <div 
    style={{
      position: 'absolute', 
      right: '0.5rem', 
      top: '4rem', 
      width: '10rem', 
      backgroundColor: '#1f2228', 
      border: '1px solid rgba(255,255,255,0.08)', 
      borderRadius: '0.5rem', 
      boxShadow: '0px 10px 24px rgba(0, 0, 0, 0.35)', 
      zIndex: 50
    }}
  >
    <button
      onClick={handleShare}
      style={{
        width: '100%', 
        padding: '0.75rem', 
        fontSize: '20px', 
        textAlign: 'center', 
        color: '#E5E7EB', 
        borderBottom: '1px solid rgba(255,255,255,0.08)', 
        backgroundColor: 'transparent', 
        cursor: 'pointer', 
        transition: 'background-color 0.2s ease',
        fontWeight: '500'
      }}
      onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.06)'}
      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
    >
      Share
    </button>
    <button
      onClick={handleEditContact}
      style={{
        width: '100%', 
        padding: '0.75rem', 
        fontSize: '20px', 
        textAlign: 'center', 
        color: '#E5E7EB', 
        backgroundColor: 'transparent', 
        cursor: 'pointer', 
        transition: 'background-color 0.2s ease',
        fontWeight: '500'
      }}
      onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.06)'}
      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
    >
      Edit Contact
    </button>
  </div>
)}







        </>
      )}

{showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
          <div className="bg-white rounded-lg p-6 w-96 relative">
            {/* Close Button */}
            <button
              onClick={handleCancel}
              className=" top-2 right-2 text-red hover:text-red-700"
              title="Close"
            >
              <IonIcon icon={closeCircleOutline} size="large" />
            </button>

            {/* Modal Content */}
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Are you sure you want to delete this chat?</h2>
            <p className="text-gray-700 mb-4">
              If you want, you can delete the chat but keep the messages.
            </p>
            <div className="flex space-x-4 text-gray-700">
              <button
                onClick={handleWipeChat}
                className="w-1/2 py-2 px-4 bg-red-500 text-black rounded-lg hover:bg-red-600"
              >
                Wipe it
              </button>
              <button
                onClick={handlePartialDelete}
                className="w-1/2 py-2 px-4 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600"
              >
                Partial Delete
              </button>
            </div>
            <button
              onClick={handleCancel}
              className="mt-4 w-full py-2 px-4 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
  {/* More Options (Three Dots) */}


  {/* Profile and Name Section */}
  {!isExpanded && userdetails && (
   <div className="flex items-center justify-between w-full max-w-3xl px-4 py-2 relative">

   {/* Left: Back Button */}
   <div className="flex items-center space-x-3">
   <button
    className="absolute left-0 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-gray-200 z-10"
    title="Back"
    onClick={(e) => {
      e.stopPropagation(); // Prevent toggleHeader
      handleBackButton();
    }}
  >
    <IonIcon icon={arrowBackOutline} size="medium" />
  </button>
 
     <div
       className="flex items-center space-x-3 cursor-pointer"
       onClick={toggleHeader}
     >
       {/* Avatar */}
       <img
         src={userdetails.avatar || img}
         alt="Avatar"
         style={{ aspectRatio: '4/3',marginLeft: '10px' }}
         className="w-12 h-12 rounded-full"
       />
 
       {/* User Name */}
       <div className="truncate" style={{ marginLeft: '8px',alignItems: 'center' }}>
  <h4 className="mb-3 font-semibold text-base">
      {userdetails.name.length > 9
        ? `${userdetails.name.slice(0, 9)}…`
        : userdetails.name}
    </h4>
       </div>
     </div>
   </div>
 
   {/* Right: Action Buttons */}
   <div className="flex items-center space-x-4" style={{ marginRight: '-10px' ,left: '0px'}}>
     <button
       className="p-1 rounded-full hover:bg-gray-200"
       title="Call"
        onClick={() => {
                  handleStartCall(true)
                  
                }}
     >
       <IonIcon icon={call} size="small" />
     </button>
     <button
       className="p-1 rounded-full hover:bg-gray-200"
       title="Video Call"
     onClick={() => {
                  handleStartCall(false)
                  
                }}
     >
       <IonIcon icon={videocam} size="small" />
     </button>
     <button
       className="p-1 rounded-full hover:bg-gray-200"
       title="More Options"
       onClick={() => handleMoreOptions(userdetails.id)}
     >
       <IonIcon icon={ellipsisVerticalOutline} size="small" />
     </button>
   </div>
 </div>
 
  )}

  {/* Expanded View - User Details and Call Options */}
     {/* Expanded Profile View */}
      {isExpanded && userdetails && (
        <div
          className="expanded-view fixed inset-0 z-50 overflow-hidden flex flex-col"
          style={{ backgroundColor: colors.background }}
          onClick={() => setShowExpandedMenu(false)}
        >
          <div
            className="flex-shrink-0 flex items-center justify-between px-4 py-4 shadow-lg border-b"
            style={{
              backgroundColor: colors.bubbleOther,
              borderColor: colors.accent,
            }}
          >
            <button
              onClick={() => setIsExpanded(false)}
              className="p-2.5 rounded-full transition-all active:scale-95"
              style={{
                color: colors.textPrimary,
                backgroundColor: `${colors.accent}20`,
              }}
              title="Back"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-xl font-bold" style={{ color: colors.textPrimary }}>
              Profile
            </h2>

            <div className="flex items-center gap-2">
           

              <div  className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowExpandedMenu(!showExpandedMenu);
                  }}
                  className="p-2.5 rounded-full transition-all active:scale-95"
                  style={{
                    color: colors.textPrimary,
                    backgroundColor: `${colors.accent}20`,
                  }}
                  title="More Options"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {showExpandedMenu && (
                  <div
                    className="absolute right-0 mt-2 w-48 rounded-xl shadow-xl border overflow-hidden z-50"
                    style={{
                      backgroundColor: colors.bubbleOther,
                      borderColor: colors.accent,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => {
                        setShowExpandedMenu(false)
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left"
                      style={{
                        backgroundColor: "transparent",
                        color: colors.textPrimary,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = `${colors.accent}20`
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent"
                      }}
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" style={{ color: colors.accent }}>
                        <path d="M11 5a2 2 0 114 0 2 2 0 01-4 0zM0 16.68l1.766-2.646a2 2 0 013.276 0L7 20m5-5a2 2 0 114 0 2 2 0 01-4 0zm.464 5.464a2 2 0 113.528-2.464M17 20h4a2 2 0 002-2V8a2 2 0 00-2-2h-4m0 16H9a2 2 0 01-2-2v-4m0-6V7a2 2 0 012-2h4" />
                      </svg>
                      <div>
                        <p className="font-semibold text-sm">Edit Contact</p>
                        <p className="text-xs" style={{ color: colors.accent }}>
                          Update contact info
                        </p>
                      </div>
                    </button>

                    <div
                      style={{
                        borderColor: `${colors.accent}30`,
                      }}
                      className="border-t"
                    ></div>

                    <button
                      onClick={() => {
                        setShowExpandedMenu(false)
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left"
                      style={{
                        backgroundColor: "transparent",
                        color: colors.textPrimary,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = `${colors.accent}20`
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent"
                      }}
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" style={{ color: colors.accent }}>
                        <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <div>
                        <p className="font-semibold text-sm">Share Contact</p>
                        <p className="text-xs" style={{ color: colors.accent }}>
                          Share this contact
                        </p>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div
            className="flex-1 overflow-y-auto px-5 py-6 space-y-6 scrollbar-hide"
            style={{ backgroundColor: colors.background }}
          >
            {/* Profile Header Section */}
            <div className="flex flex-col items-center space-y-4 pb-2">
              <div className="relative">
                <img
                  src={userdetails.avatar || "https://via.placeholder.com/120"}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover border-4 shadow-xl"
                  style={{
                    borderColor: colors.accent,
                  }}
onClick={() => isExpanded ? toglebigscreen() : toggleHeader()}
                />
              </div>

              {/* Name */}
              <div className="text-center">
                <h2 className="text-2xl font-bold" style={{ color: colors.textusersEpanded }}>
                  {userdetails.name || "User"}
                </h2>
                {userdetails.phoneNumber && (
                  <p className="text-sm font-medium mt-1" style={{ color: colors.textusersEpanded }}>
                    {userdetails.phoneNumber}
                  </p>
                )}
              </div>
            </div>

            {/* Bio Section */}
             <h1 className="text-base font-bold uppercase tracking-widest mb-3" style={{ color: colors.textusersEpanded }}>
                  Bio
                </h1>
              <div
                className="rounded-2xl p-4 border"
                style={{
                  backgroundColor: colors.bubbleOther,
                  borderColor: colors.accent,
                }}
              >
                <p className="text-sm leading-relaxed" style={{ color: colors.textPrimary }}>
                  {userdetails.bio || userdetails.About || 'No Bio'}
                </p>
              </div>
          

            {/* Call Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-semibold text-sm transition-all transform active:scale-95 shadow-md"
                style={{
                  backgroundColor: colors.bubbleYou,
                }}
                onClick={() => {setIsExpanded(false)
                  handleStartCall(true)
                  
                }}
                title="Start a call"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16.6915026,12.4744748 C16.6915026,13.2599618 15.8998815,13.8818896 14.8480176,13.8818896 L3.85866454,13.8818896 C2.80680446,13.8818896 2,13.2599618 2,12.4744748 L2,3.50717705 C2,2.72159766 2.80680446,2.09926203 3.85866454,2.09926203 L14.8480176,2.09926203 C15.8998815,2.09926203 16.6915026,2.72159766 16.6915026,3.50717705 L16.6915026,12.4744748 Z M16.6915026,12.4744748 C16.6915026,13.2599618 15.8998815,13.8818896 14.8480176,13.8818896 L3.85866454,13.8818896 C2.80680446,13.8818896 2,13.2599618 2,12.4744748 L2,3.50717705 C2,2.72159766 2.80680446,2.09926203 3.85866454,2.09926203 L14.8480176,2.09926203 C15.8998815,2.09926203 16.6915026,2.72159766 16.6915026,3.50717705 L16.6915026,12.4744748 Z M13.4908256,20.8031496 C13.4908256,21.89 12.4389617,22.5119277 11.3870978,22.5119277 C10.3352339,22.5119277 9.28337383,21.89 9.28337383,20.8031496 L9.28337383,15.972 L13.4908256,15.972 L13.4908256,20.8031496 Z" />
                </svg>
                <span>Call</span>
              </button>
              <button
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-semibold text-sm transition-all transform active:scale-95 shadow-md"
                style={{
                  backgroundColor: colors.accent,
                }}
             onClick={() => {setIsExpanded(false)
                  handleStartCall(false)
                  
                }}
                title="Start a video call"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.5,6.1c-0.2-0.6-0.8-1.1-1.5-1.1h-14C4.2,5,3.6,5.5,3.5,6.1c0,0-0.1,1.5-0.1,3.4v5.2c0,1.9,0.1,3.4,0.1,3.4C3.6,18.5,4.2,19,5,19h14c0.7,0,1.3-0.5,1.5-1.1c0,0,0.1-1.5,0.1-3.4v-5.2C20.6,7.6,20.5,6.1,20.5,6.1z M9,16.5V7.5l7,4.5L9,16.5z" />
                </svg>
                <span style={{color:'#ffffff'}}>Video</span>
              </button>
            </div>

            {/* Notifications Section */}
            <div className="space-y-3">
              <h3 className="text-base font-bold uppercase tracking-widest px-1" style={{ color: colors.textusersEpanded }}>
                Notifications
              </h3>

              <button
                className="w-full flex items-center justify-between p-3 rounded-xl border transition-all active:scale-95"
 onClick={toggleMute}
                style={{
                  backgroundColor: colors.bubbleOther,
                  borderColor: colors.accent,
                  color: colors.textPrimary,
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: colors.bubbleYou,
                    }}
                  >
                 {isMuted ? (
  // Bell Muted Icon
  <svg
    className="w-5 h-5 text-white"
    fill="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      fillRule="evenodd"
      d="M18.364 5.636a1 1 0 010 1.414L5.636 19.778a1 1 0 11-1.414-1.414l12.728-12.728a1 1 0 011.414 0zM9.964 4.19A6.002 6.002 0 0012 5c3.314 0 6 2.686 6 6v3.159c0 .538.214 1.055.595 1.436L20 17h-5m-2 0v1a3 3 0 11-6 0v-1h6z"
      clipRule="evenodd"
    />
  </svg>
) : (
  // Normal Bell Icon
  <svg
    className="w-5 h-5 text-white"
    fill="currentColor"
    viewBox="0 0 24 24"
  >
    <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0018 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
)}

                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-white text-sm"> {isMuted ? "Unmute" : "Mute"} Notifications</p>
                   
                  </div>
                </div>
          
              </button>

              <button
                className="w-full flex items-center justify-between p-3 rounded-xl border transition-all active:scale-95"
                style={{
                  backgroundColor: colors.bubbleOther,
                  borderColor: colors.accent,
                  color: colors.textPrimary,
                }}
  onClick={handleCustomNotification}

              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: colors.accent,
                    }}
                  >
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M10 19a9 9 0 100-18 9 9 0 000 18zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-white text-sm">Custom notification</p>
                    <p className="text-xs" style={{ color: colors.accent }}
   title={sound ? `${sound.fileName} (${sound.soundPath})` : ""}
    >
      {sound
        ? `${sound.fileName}`.slice(0, 15) + '...'
        : "No custom sound selected blah blah blah ".slice(0, 15) + '...'}
    </p>

    {/*handleRemoveCustomNotification*/}
                  </div>
                </div>
          
              </button>
            </div>










 {showAll && (
 <div style={{ height: '100dvh', position: 'fixed', top: 0, left: 0, width: '100%', backgroundColor: 'var(--background)', display: 'flex', flexDirection: 'column',overflow: 'hidden' }}>
         
         {/* Header */}
         <div className="flex space-x-2 p-4 border-b border-gray-300" style={{ backgroundColor: 'rgba(var(--bs-primary-rgb), var(--bs-bg-opacity))', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10,height:'120px' }}>
  {selectionModeFile ? (
    <>
      <button
        onClick={handleCancelSelection}
        className="text-black hover:underline p-2 flex items-center text-xl"
        style={{ position: 'absolute', top: '10px', left: '10px' }}
      >
        <IonIcon icon={closeOutline} size="small" />
      </button>
      <div className='flex space-x-2 ' style={{ position: 'absolute', top: '10px', right: '10px' }}>

     
      <button
        onClick={handleForwardFiles(selectedFiles)}
        className="text-black hover:underline p-2 flex items-center text-xl"
       
      >
        <IonIcon icon={arrowRedoOutline} size="small" />
      </button>
      <button
        onClick={handleDeleteFiles(selectedFiles)}
        className="text-black hover:underline p-2 flex items-center text-xl"
       
      >
        <IonIcon icon={trashOutline} size="small" />
      </button>
      </div>
      
      <div className="flex justify-center w-full space-x-3 mt-4">
        {['images', 'videos', 'documents', 'audio'].map((tab) => (
          <button
            key={tab}
            style={{ fontSize: '18px' }}
            onClick={() => setSelectedTab(tab)}
            className={`font-semibold text-black ${selectedTab === tab ? 'border-b-2 border-indigo-600' : ''} hover:text-indigo-600`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
      {/* Later add delete/copy buttons here */}
    </>
  ) : (
    <>
      <button
        onClick={handleBack}
        className="text-black hover:underline p-2 flex items-center text-xl"
        style={{ position: 'absolute', top: '10px', left: '10px' }}
      >
        <IonIcon icon={arrowBackOutline} size="small" /> 
      </button>

      <div className="flex justify-center w-full space-x-3 mt-4">
        {['images', 'videos', 'documents'].map((tab) => (
          <button
            key={tab}
            style={{ fontSize: '18px' }}
            onClick={() => setSelectedTab(tab)}
            className={`font-semibold text-black ${selectedTab === tab ? 'border-b-2 border-indigo-600' : ''} hover:text-indigo-600`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
    </>
  )}
</div>

 <div className="flex-1 overflow-y-auto">
           {selectedTab === 'images' && (
             <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 p-2 ">
             {localchat_messages.current?.filter(msg => msg.file_type === "image" && msg.isDownload === 1).map((msg, index) => (
  <div
    key={index}
    className="w-full aspect-square bg-gray-100 overflow-hidden rounded-lg relative"
    onClick={() => handleFileClick(msg)}
onMouseDown={() => handlePressStart1(msg)}
  onMouseUp={handlePressEnd1}
  onMouseLeave={handlePressEnd1}
  onTouchStart={() => handlePressStart1(msg)}
  onTouchEnd={handlePressEnd1}
  >
    <ImageRenderer
      src={msg.file_path}
      alt={`file ${index + 1}`}
      className="w-full h-full object-cover"
      zoomable
      maxZoom={3.5}
        onClick={() => {
                    if (msg.isDownload !== 0) {
                      handleImageClick(msg.file_path);
                    } else if (!isDownloading[msg.id] && msg.isError === 0) {
                      handleFileDownload(msg);
                    }
                  }}
    />
    {/* Checkmark if selected */}
    {selectedFiles.some(f => f.id === msg.id) && (
      <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full p-1">
        ✓
      </div>
    )}
  </div>
))}

             </div>
           )}
     
           {selectedTab === 'videos' && (
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-2">
               {getFilesByType('video').map((msg, index) => (
                 <div key={index} style={{ position: "relative", width: "100%", aspectRatio: "1/1", overflow: "hidden", borderRadius: 8 }}
                 onMouseDown={() => handlePressStart1(msg)}
  onMouseUp={handlePressEnd1}
  onMouseLeave={handlePressEnd1}
  onTouchStart={() => handlePressStart1(msg)}
  onTouchEnd={handlePressEnd1}
                
                onClick={() => handleFileClick(msg)}
                >
                   <VideoRenderer
                     src={msg.file_path}
                     muted
                     Name={msg.file_name}
                     Size={msg.file_size}
                     onClick={() => handleVideoClick(msg)}
                   
                     playsInline
                     style={{
                       width: "100%",
                       height: "100%",
                       objectFit: "cover",
                       pointerEvents: "none",
                     }}
                   />
                   {/* Play button overlay */}
                   <div
                     style={{
                       position: "absolute",
                       top: "50%",
                       left: "50%",
                       transform: "translate(-50%, -50%)",
                       backgroundColor: "rgba(0, 0, 0, 0.5)",
                       borderRadius: "50%",
                       padding: "10px",
                     }}
                   >
                     <IonIcon icon={playCircleOutline} style={{ color: "white", fontSize: 40 }} onClick={() => handleVideoClick(msg)} />
                   </div>
                   {selectedFiles.some(f => f.id === msg.id) && (
      <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full p-1">
        ✓
      </div>
    )}
                 </div>
               ))}
             </div>
           )}
     
           {selectedTab === 'documents' && (
             <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 p-2">
               {localchat_messages.current?.filter(msg => msg.file_type !== "audio" && msg.file_type !== "video" && msg.file_type !== "image" && msg.isDownload === 1).map((msg, index) => (
                 <div key={index} className="w-full aspect-square bg-gray-100 flex flex-col items-center justify-center rounded-lg overflow-hidden" 
                    onMouseDown={() => handlePressStart1(msg)}
  onMouseUp={handlePressEnd1}
  onMouseLeave={handlePressEnd1}
  onTouchStart={() => handlePressStart1(msg)}
  onTouchEnd={handlePressEnd1}
                onClick={() => handleFileOpen(msg)}>
                   <IonIcon icon={documentOutline} size="large" className="text-red-500" />
                   <p className="text-xs text-gray-400 mt-1 text-center px-1">{msg.file_name}</p>
                 </div>
               ))}
                     {selectedFiles.some(f => f.id === msg.id) && (
      <div className="absolute top-1 right-1 bg-blue-500 text-white rounded-full p-1">
        ✓
      </div>
    )}
             </div>
           )}
     
          
         </div>
       </div>





)}









            {/* Media Section */}

            {!showAll && ( 
            <div className="space-y-3">
              <h3 className="text-base font-bold uppercase tracking-widest px-1" style={{ color: colors.textusersEpanded }}>
                Media
              </h3>

              <div className="grid grid-cols-3 gap-2">
                <button
                  className="flex flex-col items-center justify-center gap-2 py-4 px-3 rounded-xl text-white font-semibold text-xs transition-all transform hover:scale-105 active:scale-95 shadow-sm"
                  style={{
                    backgroundColor: colors.bubbleYou,
                  }}
onClick={() => { 

handleViewAll()
setSelectedTab('images')
}
}

                >
                  <span className="text-2xl">🖼️</span>
                  <span className="text-sm">Photos</span>
                </button>
                <button
                  className="flex flex-col items-center justify-center gap-2 py-4 px-3 rounded-xl text-white font-semibold text-xs transition-all transform hover:scale-105 active:scale-95 shadow-sm"
                  style={{
                    backgroundColor: colors.accent,
                  }}
onClick={() => { 

handleViewAll()
setSelectedTab('videos')
}
}
                >
                  <span className="text-2xl">📷</span>
                  <span className="text-sm">Shots</span>
                </button>
                <button
                  className="flex flex-col items-center justify-center gap-2 py-4 px-3 rounded-xl text-white font-semibold text-xs transition-all transform hover:scale-105 active:scale-95 shadow-sm"
                  style={{
                    backgroundColor: colors.bubbleYou,
                  }}
onClick={() => { 

handleViewAll()
setSelectedTab('documents')
}
}
                >
                  <span className="text-2xl">🎥</span>
                  <span className="text-sm">Videos</span>
                </button>
              </div>
            </div>)}


            {/* Actions Section */}
            <div className="space-y-2 pb-6">
              <h3 className="text-base font-bold uppercase tracking-widest px-1" style={{ color: colors.textusersEpanded }}>
                Actions
              </h3>

              <button
                className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-95 group"
                style={{
                  backgroundColor: colors.bubbleOther,
                  borderColor: colors.accent,
                  color: colors.textPrimary,
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:shadow-md transition-shadow"
                  style={{
                    backgroundColor: colors.bubbleYou,
                  }}
                >
                  <span className="text-sm">⭐</span>
                </div>
                <p className="font-semibold text-white text-sm flex-1 text-left">Mark Important</p>
              </button>

              <button
                className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-95 group"
                style={{
                  backgroundColor: colors.bubbleOther,
                  borderColor: colors.accent,
                  color: colors.textPrimary,
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:shadow-md transition-shadow"
                  style={{
                    backgroundColor: colors.accent,
                  }}
                >
                  <span className="text-sm">📌</span>
                </div>
                <p className="font-semibold text-white text-sm flex-1 text-left">Pin Chat</p>
              </button>

              <button
                className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-95 group"
                style={{
                  backgroundColor: colors.bubbleOther,
                  borderColor: colors.accent,
                  color: colors.textPrimary,
                }}
  onClick={handleArchive}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:shadow-md transition-shadow"
                  style={{
                    backgroundColor: colors.bubbleYou,
                  }}
                >
                  <span className="text-sm">🗂️</span>
                </div>
                <p className="font-semibold text-white text-sm flex-1 text-left">Archive Chat</p>
              </button>

       <button
  className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-95 group"
  style={{
    backgroundColor: colors.bubbleOther,
    borderColor: colors.accent,
    color: colors.textPrimary,
    opacity: isTargetBlocked ? 0.8 : 1,
  }}
  onClick={isTargetBlocked ? handleUnblock : handleBlock}
>
  <div
    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:shadow-md transition-shadow"
    style={{
      backgroundColor: colors.bubbleYou,
    }}
  >
    <span className="text-sm">
      {isTargetBlocked ? '✅' : '🚫'}
    </span>
  </div>

  <p className="font-semibold text-white text-sm flex-1 text-left">
    {isTargetBlocked ? 'Unblock User' : 'Block User'}
  </p>
</button>


              <button
                className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-95 group"
                style={{
                  backgroundColor: colors.bubbleOther,
                  borderColor: colors.accent,
                  color: colors.textPrimary,
                }}
  onClick={handleDeleteChat}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:shadow-md transition-shadow"
                  style={{
                    backgroundColor: colors.accent,
                  }}
                >
                  <span className="text-sm">🗑️</span>
                </div>
                <p className="font-semibold text-white text-sm flex-1 text-left">Delete Chat</p>
              </button>
            </div>
          </div>
        </div>
      )}

</div>
)
}


            {/* Messages container */}
  <div
  className="messages-container flex-grow flex flex-col-reverse overflow-y-auto p-3"
  style={{
    marginTop: "70px",
    backgroundColor: "var(--background)",
 backgroundImage: " linear-gradient(rgba(var(--chat-bg-overlay), 0.9), rgba(var(--chat-bg-overlay), 0.9)), url('/circuit-board/circuit-board.svg')",

     backgroundRepeat: "repeat",
    backgroundSize: "304px 304px",
  }}
  ref={scrollRef}
  onScroll={handleScroll} >
            <div ref={messagesEndRef} />
            {!isInView && !isExpanded &&(
        <button
          ref={buttonRef}
          onClick={scrollToMessages}
          style={{
            position: 'fixed',
            bottom: '20dvh',
            right: '20px',
            padding: '15px 15px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
            zIndex: 1000,
          }}
        >
        <FaArrowDown size={20} />

        </button>
      )}
      
      {localchat_messages.current && getSortedMessages().map((msg,index) => (
           <div key={msg.id}  
           data-message-id={String(msg.id || "")}
           onMouseDown={() => handlePressStart(msg)}
           onMouseUp={handlePressEnd}
            ref={index === 0 ? topMessageRef : null} 
           onTouchStart={(e) => handleMessageTouchStart(e, msg)}
           onTouchMove={handleMessageTouchMove}
           onClick={() => handleClick(msg)}
           onTouchEnd={handleMessageTouchEnd}

           className={`d-flex mb-2 ${
             msg.sender === user._id ? "justify-content-end" : "justify-content-start"
           }`}style={{
             width: '100%',
             backgroundColor: isSelected(msg) ? '#e8f7fe' : 'transparent',
             transition: "box-shadow 180ms ease, background-color 180ms ease",
             boxShadow: glowMessageId === String(msg.id || "") ? "0 0 0 3px rgba(75,143,232,0.55)" : "none",
             borderRadius: "10px"
           }}>
             {msg.type === "file" ? (
                <div
                className="file-message position-relative p-2 rounded"

                style={{
                  backgroundColor: msg.file_type === "video" ? "#f5f5f5" : "#e8f7fe", // Different color for video and image
                  maxWidth: "90%",
                  borderRadius: "12px",
                  wordWrap: "break-word",
                }}
              >
          
                  
                  
                  
                  
                  
                  
                  
                  {     msg.file_type === "audio" ? (
 <div 
 className="audio-message d-flex p-2" 
 style={{
   backgroundColor: "#075E54",
   borderRadius: "20px",
   width: "100%",
   alignItems: "center",
   position: "relative",
 }}
>

{msg.sender === userdetails.id && msg.isError === 1 && (
  isDownloading[msg.id] ? (
    <IonSpinner name="crescent" color="primary" />
  ) : (
    <IonButton 
         fill="clear" 
         onClick={() => handleFileDownload(msg)} 
         disabled={isDownloading[msg.id]}
         style={{ minWidth: 40, height: 40 }}
       >
         <input
                type="range"
                min="0"
                max="100"
                value={0}
                disabled
                style={{
                  flex: 1,
                  appearance: "none",
                  height: "4px",
                  borderRadius: "2px",
                  backgroundColor: "#C4C4C4",  // Light gray seekbar for dummy
                  outline: "none",
                  cursor: "not-allowed",
                }}
              />
         {isDownloading[msg.id] ? (
           <IonSpinner color="light" />
         ) : (
           <IonIcon icon={downloadOutline} color="light" />
         )}
       </IonButton>
  )
)}
{msg.sender === user._id && (
  <div
    className="message-status d-flex align-items-center gap-1"
    style={{
      position: 'absolute',
      bottom: '5px',
      right: '5px',
      display: 'flex',
      alignItems: 'center',
    }}
  >
    {/* If not sent and error, show red exclamation + Retry */}

    {msg.sender === user._id && msg.isSent === 0 && msg.isError === 1 && (
      <>
        <i className="bi bi-exclamation-circle-fill" style={{ fontSize: '1.2rem', color: 'red' }}></i>
        <button 
          onClick={() => handleResend(msg)} 
          style={{
            background: 'none',
            border: 'none',
            color: '#007bff',
            cursor: 'pointer',
            padding: 0,
            fontSize: '0.9rem',
            textDecoration: 'underline'
          }}
        >
          Retry
        </button>
      </>
    )}



    {/* If not sent and not error, show no wifi */}
    {msg.isSent === 0 && msg.isError === 0 && (
      <i className="bi bi-wifi-off" style={{ fontSize: '1.2rem', color: 'gray' }}></i>
    )}

    {/* If sent, show appropriate status */}
    {msg.isSent === 1 && (
      <>
        {msg.status === "pending" && (
          <IoCheckmarkSharp size = '1.2rem' ></IoCheckmarkSharp>
        )}
        {msg.status === "sent" && msg.read === 0 && (
          <IoCheckmarkDoneSharp size='1.2rem'></IoCheckmarkDoneSharp>
        )}
        {msg.status === "sent" && msg.read === 1 && (
          <CiRead size='1.2rem' ></CiRead>
        )}
      </>
    )}
  </div>
)}

 {/* Sender Profile Photo */}
 <img 
   src={userdetails.avatar ? userdetails.avatar : img} 
   alt="sender" 
   style={{ 
     width: 35, 
     height: 35, 
     borderRadius: "50%", 
     objectFit: "cover", 
     marginRight: 10 
   }} 
 />

 {/* Audio Section */}
 <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
   <div className="d-flex align-items-center" style={{ position: "relative", top: "3px" }}>
     {msg.isError === 0 && msg.isDownload === 0 ? (
       // Show DOWNLOAD button (not fake player)
       <IonButton 
         fill="clear" 
         onClick={() => handleFileDownload(msg)} 
         disabled={isDownloading[msg.id]}
         style={{ minWidth: 40, height: 40 }}
       >
         <input
                type="range"
                min="0"
                max="100"
                value={0}
                disabled
                style={{
                  flex: 1,
                  appearance: "none",
                  height: "4px",
                  borderRadius: "2px",
                  backgroundColor: "#C4C4C4",  // Light gray seekbar for dummy
                  outline: "none",
                  cursor: "not-allowed",
                }}
              />
         {isDownloading[msg.id] ? (
           <IonSpinner color="light" />
         ) : (
           <IonIcon icon={downloadOutline} color="light" />
         )}
       </IonButton>
     ) : (
       // Show real audio player after downloaded
       <waveForm audioFile={msg.file_path} msg = {msg} />
     )}
   </div>
 </div>
</div>
)
: msg.file_type !== "image" && msg.file_type !== "video"   && msg.file_type !== "audio" ? (
  <div className="file-message bg-secondary p-3 rounded-lg flex flex-col max-w-xs" style={{ width: '200px',height: '200px', position: 'relative' }}>
    {msg.sender === user._id && (
  <div
    className="message-status d-flex align-items-center gap-1"
    style={{
      position: 'absolute',
      bottom: '5px',
      right: '5px',
      display: 'flex',
      alignItems: 'center',
    }}
  >
    {/* If not sent and error, show red exclamation + Retry */}
    {msg.isSent === 0 && msg.isError === 1 && (
      <>
        <i className="bi bi-exclamation-circle-fill" style={{ fontSize: '1.2rem', color: 'red' }}></i>
        <button 
          onClick={() => handleResend(msg)} 
          style={{
            background: 'none',
            border: 'none',
            color: '#007bff',
            cursor: 'pointer',
            padding: 0,
            fontSize: '0.9rem',
            textDecoration: 'underline'
          }}
        >
          Retry
        </button>
      </>
    )}




    {/* If not sent and not error, show no wifi */}
    {msg.isSent === 0 && msg.isError === 0 && (
      <i className="bi bi-wifi-off" style={{ fontSize: '1.2rem', color: 'gray' }}></i>
    )}

    {/* If sent, show appropriate status */}
    {msg.isSent === 1 && (
      <>
       {msg.status === "pending" && (
          <IoCheckmarkSharp size = '1.2rem' ></IoCheckmarkSharp>
        )}
        {msg.status === "sent" && msg.read === 0 && (
          <IoCheckmarkDoneSharp size='1.2rem'></IoCheckmarkDoneSharp>
        )}
        {msg.status === "sent" && msg.read === 1 && (
          <CiRead size='1.2rem' ></CiRead>
        )}
      </>
    )}
  </div>
)}
{msg.sender === userdetails.id && msg.isError === 1 && (
  isDownloading[msg.id] ? (
    <IonSpinner name="crescent" color="primary" />
  ) : (
    <button
      onClick={() => handleFileDownload(msg)}
      style={{
        padding: '6px 12px',
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '0.85rem',
        cursor: 'pointer'
      }}
    >
      Retry
    </button>
  )
)}
    {/* Preview Section */}
    {msg.isDownload !== 0 && msg.file_type === "pdf" && msg.file_path ? (
      <div className="w-full h-[200px] rounded-lg overflow-hidden bg-gray-200 flex items-center justify-center mb-2">
        <DocumentRenderer
          data={msg.file_path}
          type={msg.file_type}
          className="w-full h-full pointer-events-none"
          style={{ overflow: 'hidden' }}
        >
          <div className="flex flex-col items-center justify-center h-full">
            <IonIcon icon={documentOutline} size="large" className="text-red-500" />
            <p className="text-xs text-gray-400">Preview not available</p>
          </div>
        </DocumentRenderer>
      </div>
    ) : (
      <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center mb-2 h-[200px]">
        <IonIcon icon={documentOutline} size="large" className="text-red-500" />
      </div>
    )}

    {/* File Info + Button */}
    <div className="flex items-center justify-between">
      <div className="flex flex-col max-w-[130px]">
        <strong className="text-sm truncate">{msg.file_name}</strong>
        {msg.file_size && (
          <small className="text-xs text-gray-400">
            {(msg.file_size / 1024).toFixed(1)} KB
          </small>
        )}
      </div>
      <div className="ml-2">
        {msg.isError === 0 && msg.isDownload === 0 ? (
          <IonButton size="small" fill="clear" onClick={() => handleFileDownload(msg)} disabled={isDownloading[msg.id]}>
            <IonIcon icon={downloadOutline} />
          </IonButton>
        ) : (
          <IonButton size="small" fill="clear" onClick={() => handleFileOpen(msg)}>
            Open
          </IonButton>
        )}
      </div>
    </div>

    {/* Timestamp */}
    <div className="text-right mt-1">
      <small className="text-[10px] text-gray-400">
        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </small>
    </div>
  </div>
) :  msg.file_type === "video" ? (
  <div
  className="video-container"
  style={{
    width: '200px',
    height: '200px',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    cursor: 'pointer',
    background: msg.sender === user._id
      ? 'linear-gradient(135deg, #13e247, #3bb9ff)'
      : 'linear-gradient(135deg, #ff8c00, #1722B9)',
    padding: '5px',
    boxShadow: '0 1px 3px rgba(59, 185, 243, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }}
>
  {/* =============== SENDER IS CURRENT USER =============== */}
  {msg.sender === user._id && (
    <>
      {/* =========== ERROR CASE ========== */}
      {msg.isError === 1 ? (
        isDownloading[msg.id] ? (
          <IonSpinner name="crescent" color="primary" />
        ) : (
          <>
          <button
            onClick={() => handleResend(msg)}
            style={{
              padding: '6px 12px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.85rem',
              cursor: 'pointer',
              position: 'absolute',
              top: '10%',
              right: '10%',
              zIndex: 2

              
            }}
          >
            Retry
          </button>
             <VideoRenderer
            src={msg.file_path}
            muted
            Name={msg.file_name}
            Size={msg.file_size}
            playsInline
         style={{
                  position: 'absolute',
                       width: "90%",
                       height: "90%",
                       objectFit: "cover",
                       pointerEvents: "none",
                       zIndex: 0
                     }}
          />
          </>
        )
      ) : (
        <>
          {/* Show video thumbnail + play button overlay */}
          <VideoRenderer
            src={msg.file_path}
            muted
            Name={msg.file_name}
            Size={msg.file_size}
            playsInline
                style={{
                  position: 'absolute',
                       width: "90%",
                       height: "90%",
                       objectFit: "cover",
                       pointerEvents: "none",
                       zIndex: 0
                     }}
        
          />
          <div
            style={{
              position: 'absolute',
         
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              borderRadius: '50%',
              padding: '10px',
              top: '50%',
              left: '50%',
              cursor: 'pointer',
              zIndex: 6
            }}
          >
            {loadingMessages[msg.id] ? (
              <IonSpinner style={{ color: 'white', fontSize: 40 }} />
            ) : (
              <IonIcon
                icon={playCircleOutline}
                style={{ color: 'white', fontSize: 40 }}
                onClick={() => handleVideoClick(msg)}
              />
            )}
          </div>
        </>
      )}

      {/* Message status (bottom right corner) */}
      <div
        style={{
          position: 'absolute',
          bottom: '5px',
          right: '5px',
          display: 'flex',
          alignItems: 'center',
        
        }}
      >
      {msg.isSent === 0 && msg.isError === 1 && (
  <>
    {isDownloading[msg.id] ? (
      <IonSpinner name="dots" style={{ fontSize: '1.5rem', color: 'gray' , position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)'}} /> // Ion Spinner
    ) : (
      <>
        <i className="bi bi-exclamation-circle-fill" style={{ fontSize: '1.2rem', color: 'red',zIndex:'2' }}></i>
        <button 
          onClick={() => handleResend(msg)} 
          style={{
            background: 'none',
            border: 'none',
            color: '#007bff',
            cursor: 'pointer',
            padding: 0,
            fontSize: '0.9rem',
            textDecoration: 'underline',
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 3
          }}
        >
          Retry
        </button>
      </>
    )}
  </>
)}
        {msg.isSent === 0 && msg.isError === 0 && (
          <i className="bi bi-wifi-off" style={{ fontSize: '1.2rem', color: 'gray', zIndex:'3'}}></i>
        )}
        {msg.isSent === 1 && (
          <>
   {msg.status === "pending" && (
          <IoCheckmarkSharp size = '1.2rem' ></IoCheckmarkSharp>
        )}
        {msg.status === "sent" && msg.read === 0 && (
          <IoCheckmarkDoneSharp size='1.2rem'></IoCheckmarkDoneSharp>
        )}
        {msg.status === "sent" && msg.read === 1 && (
          <CiRead size='1.2rem' ></CiRead>
        )}
          </>
        )}
      </div>
    </>
  )}

  {/* =============== RECEIVER SIDE (DOWNLOADED OR NOT) =============== */}
  {msg.sender === userdetails.id && msg.isDownload === 0 ? (
    // Show thumbnail and download or retry option
<>
      <img
        src={msg.thumbnail || 'https://via.placeholder.com/200'}
        alt="Video Thumbnail should not be empty"
        style={{
          width: '90%',
          height: '90%',
          objectFit: 'cover',
          borderRadius: 8,
          zIndex: 0,
          position: 'absolute',
          
        }}
      />
      <div
        style={{
          position: 'absolute',
top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          borderRadius: '50%',
          padding: '10px',
          zIndex: 6
        }}
      >
        {msg.isError === 1 ? (
          isDownloading[msg.id] ? (
            <IonSpinner name="crescent" color="primary" />
          ) : (
            <button
              onClick={() => handleFileDownload(msg)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                borderRadius: '8px',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          )
        ) : (
          <IonButton
            fill="clear"
            onClick={() => handleFileDownload(msg)}
            disabled={isDownloading[msg.id]}
          >
            {isDownloading[msg.id] ? <IonSpinner /> : <IonIcon icon={downloadOutline} />}
          </IonButton>
        )}
      </div>
      </>
   
  ) : (
    // When video is already downloaded
<>
  {msg.sender === userdetails.id ? (
<>
    <VideoRenderer
      src={msg.file_path}
      Name={msg.file_name}
      Size={msg.file_size}
      muted
      playsInline
     style={{
                  position: 'absolute',
                       width: "90%",
                       height: "90%",
                       objectFit: "cover",
                       pointerEvents: "none",
                       zIndex: 0
                     }}
    />
    <div
      style={{
        position: 'absolute',
      top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: '50%',
        padding: '10px',
        zIndex: 6
      }}
    >
      {loadingMessages[msg.id] ? (
        <IonSpinner style={{ color: 'white', fontSize: 40 }} />
      ) : (
        <IonIcon
          icon={playCircleOutline}
          style={{ color: 'white', fontSize: 40 }}
          onClick={() => handleVideoClick(msg)}
        />
      )}
    </div>
</>
) : null}

      </>
  )}
</div>

              ) : msg.file_type === "image" && (
                <div
                style={{
                  width: '150px',
                  height: '150px',
                  borderRadius: '12px',
                  position: 'relative',
                  background: msg.sender === user._id
                    ? "linear-gradient(135deg, #13e247, #3bb9ff)"
                    : "linear-gradient(135deg, #ff8c00, #ff5500)",
                  border: "2px solid #34B7F1",
                  padding: "5px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                }}
              >
                {msg.sender === user._id && (
  <div
    className="message-status d-flex align-items-center gap-1"
    style={{
      position: 'absolute',
      bottom: '5px',
      right: '5px',
      display: 'flex',
      alignItems: 'center',
    }}
  >
    {/* If not sent and error, show red exclamation + Retry */}
    {msg.isSent === 0 && msg.isError === 1 && (
  <>
    {isDownloading[msg.id] ? (
      <IonSpinner name="dots" style={{ fontSize: '1.5rem', color: 'gray' ,position:'absolute',top: '50%',left: '50%',transform: 'translate(-50%, -50%)'}} /> // Ion Spinner
    ) : (
      <>
        <i className="bi bi-exclamation-circle-fill" style={{ fontSize: '1.2rem', color: 'red' }}></i>
        <button 
          onClick={() => handleResend(msg)} 
          style={{
            background: 'none',
            border: 'none',
            color: '#007bff',
            cursor: 'pointer',
            position:'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            padding: 0,
            fontSize: '0.9rem',
            textDecoration: 'underline'
          }}
        >
          Retry
        </button>
      </>
    )}
  </>
)}


    {/* If not sent and not error, show no wifi */}
    {msg.isSent === 0 && msg.isError === 0 && (
      <i className="bi bi-wifi-off" style={{ fontSize: '1.2rem', color: 'gray',zIndex:'3' }}></i>
    )}

    {/* If sent, show appropriate status */}
    {msg.isSent === 1 && (
      <>
          {msg.status === "pending" && (
          <IoCheckmarkSharp size = '1.2rem' ></IoCheckmarkSharp>
        )}
        {msg.status === "sent" && msg.read === 0 && (
          <IoCheckmarkDoneSharp size='1.2rem'></IoCheckmarkDoneSharp>
        )}
        {msg.status === "sent" && msg.read === 1 && (
          <CiRead size='1.2rem' ></CiRead>
        )}
      </>
    )}
  </div>
)}
{msg.sender === userdetails.id && msg.isError === 1 && (
  isDownloading[msg.id] ? (
    <IonSpinner name="crescent" color="primary" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
  ) : (
    <button
      onClick={() => handleFileDownload(msg)}
      style={{
        padding: '6px 12px',
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        borderRadius: '8px',

        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        fontSize: '0.85rem',
        cursor: 'pointer',
     
      }}
    >
      Retry
    </button>
  )
)}
{msg.isDownload === 1  ? (
  

                <ImageRenderer
                  src={msg.file_path}
                  alt={msg.fileName}
                  zoomable
                  maxZoom={3.5}
                  style={{ width: '100%', height: '100%', borderRadius: '8px', cursor: 'pointer' }}
                  onClick={() => {
                    if (msg.isDownload !== 0) {
                      handleImageClick(msg.file_path);
                    } else if (!isDownloading[msg.id] && msg.isError === 0) {
                      handleFileDownload(msg);
                    }
                  }}
                />) : (
                  <>
               
                <img 
                src={msg.thumbnail}
                    alt={msg.fileName}
                          style={{ width: '100%', height: '100%', borderRadius: '8px', cursor: 'pointer' }}
                               onClick={() => {
                    if (msg.isDownload !== 0) {
                      handleImageClick(msg.file_path);
                    } else if (!isDownloading[msg.id] && msg.isError === 0) {
                      handleFileDownload(msg);
                    }
                  }}
                />
                </>
                )}
            
                {/* Timestamp */}
                <small style={{
                  position: "absolute",
                  bottom: "5px",
                  left: "8px",
                  color: "white",
                  backgroundColor: "rgba(0,0,0,0.5)",
                  padding: "2px 6px",
                  borderRadius: "10px",
                  fontSize: "10px"
                }}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </small>
            
                {/* Show Spinner if downloading */}
                { msg.isError === 0 && isDownloading[msg.id] && (
                  <IonSpinner
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)'
                    }}
                  />
                )}
            
                {/* Show Download Button if not downloaded and not downloading */}
                {msg.isError === 0 && msg.isDownload === 0 && !isDownloading[msg.id] && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFileDownload(msg);
                    }}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      background: '#34B7F1',
                      padding: '5px 10px',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      color: 'white',
                      textAlign: 'center'
                    }}
                  >
                    Download
                  </div>
                )}
              </div>
                              
                               )}
                             </div>
          ) : (
            <div
            className={`max-w-xs p-3 rounded-lg shadow `}
            style={{
              position: 'relative' ,
              maxWidth: "20rem",         // max-w-xs = max-width: 20rem
              padding: "0.75rem",         // p-3 = padding: 0.75rem
              borderRadius: "0.5rem",     // rounded-lg = border-radius: 0.5rem
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)", // shadow = basic light shadow
              backgroundColor: msg.sender === user._id ? "white" : "#BFDBFE", // bg-white or bg-blue-250
              color: msg.sender === user._id ? "black" : "black"             // text-black or text-red-1000
            }}
        >
            <p>{msg.content}</p>
            {renderReplyPreview(msg)}
            <small className="block mb-2 my-2 text-right">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </small>
            
            {/* Show message status only if the message is sent by the current user */}
            {msg.sender === user._id && (
  <div className="message-status d-flex align-items-center gap-1" style={{ position: 'absolute', bottom: '5px', right: '5px' }}>
    {/* If not sent and error, show red exclamation circle + retry button */}
    {msg.isSent === 0 && msg.isError === 1 && (
      <>
        <i className="bi bi-exclamation-circle-fill" style={{ fontSize: '1.2rem', color: 'red' }}></i>
        <button 
          onClick={() => handleResend(msg)} 
          style={{
            background: 'none',
            border: 'none',
            color: '#007bff',
            cursor: 'pointer',
            padding: 0,
            fontSize: '0.9rem',
            textDecoration: 'underline'
          }}
        >
          Retry
        </button>
      </>
    )}
    

    {/* If not sent and not error, show no wifi icon */}
    {msg.isSent === 0 && msg.isError === 0 && (
      <i className="bi bi-wifi-off" style={{ fontSize: '1.2rem', color: 'gray' }}></i>
    )}

    {/* If sent, show based on status and read */}
    {msg.isSent === 1 && (
      <>
    {msg.status === "pending" && (
          <IoCheckmarkSharp size = '1.2rem' ></IoCheckmarkSharp>
        )}
        {msg.status === "sent" && msg.read === 0 && (
          <IoCheckmarkDoneSharp size='1.2rem'></IoCheckmarkDoneSharp>
        )}
        {msg.status === "sent" && msg.read === 1 && (
          <CiRead size='1.2rem' ></CiRead>
        )}
      </>
    )}
  </div>
)}



        </div>
          )}
        </div>
      ))}
      {!selectionMode && !isExpanded && (
        <div className="d-flex justify-content-center px-2 mb-2" style={{ paddingTop: "14px" }}>
          <div
            style={{
              width: "min(92%, 420px)",
              background: "#20242b",
              border: "1px solid #343b46",
              color: "#e5e7eb",
              borderRadius: "18px",
              padding: "14px 12px",
              textAlign: "center",
              boxShadow: "0 6px 14px rgba(0, 0, 0, 0.18)",
            }}
          >
            <img
              src={introAvatar}
              alt={introName}
              style={{
                width: "82px",
                height: "82px",
                borderRadius: "50%",
                objectFit: "cover",
                margin: "0 auto 8px",
                border: "2px solid #4b5563",
              }}
            />
            <h6 style={{ margin: "0 0 4px", fontSize: "1rem", fontWeight: 700 }}>{introName}</h6>
            {introCreatedAt ? (
              <div style={{ fontSize: "0.83rem", color: "#cbd5e1", marginBottom: "6px" }}>
                {new Date(introCreatedAt).toLocaleString([], {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            ) : null}
            <div
              style={{
                fontSize: "0.82rem",
                color: "#d1d5db",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {introDescription}
            </div>
          </div>
        </div>
      )}

      {fullscreenImage && (
  <div
    className="fullscreen-container"
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "black",
      zIndex: 9999,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    <ImageRenderer
      src={fullscreenImage}
      alt='image'
      zoomable
      maxZoom={4}
      style={{
        maxWidth: "100%",
        maxHeight: "100%",
        objectFit: "contain"
      }}
      onClick={() => {}}
    />

    <button
      onClick={closeImageFullscreen}
      style={{
        position: "absolute",
        top: "10px",
        right: "10px",
        backgroundColor: "black",
        color: "white",
        margin: "10px",
        padding: "10px",
        zIndex: 10000,
        cursor: "pointer",
      }}
      className="close-button"
    >
      Close
    </button>
  </div>
)}

    </div>

      {replyTargetMessage ? (
        <div
          onClick={() => scrollToMessageById(replyTargetMessage.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              scrollToMessageById(replyTargetMessage.id);
            }
          }}
          style={{
            margin: "0 12px 6px",
            backgroundColor: "#4b8fe8",
            color: "#fff",
            borderRadius: "9px",
            padding: "7px 10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              fontSize: "0.82rem",
              fontWeight: 600,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {getReplyBarLabel(replyTargetMessage)}
          </div>
          <div
            style={{
              fontSize: "0.72rem",
              opacity: 0.9,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              marginLeft: "6px",
              flex: 1,
              textAlign: "right",
            }}
          >
            {getReplyBarMeta(replyTargetMessage)}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setReplyTargetMessage(null);
            }}
            style={{
              border: "none",
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              lineHeight: 1,
              fontWeight: 700,
              background: "rgba(255,255,255,0.2)",
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label="Cancel reply"
          >
            <MdClose size={14} />
          </button>
        </div>
      ) : null}

            {/* Message input form */}
	  <form
  onSubmit={sendMessage}
  className="flex items-center gap-2"
  style={{
    zIndex: 100,
    minHeight: "72px",
    padding: "10px 12px",
    borderTop: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "16px",
    boxShadow: "0px -6px 20px rgba(0, 0, 0, 0.25)",
    backgroundColor: "rgba(33, 36, 41, 0.98)"
  }}
>
  {isRecording  ? (
    // 🎤 Voice Recording Mode UI
     <VoiceRecordingUI
      isRecording={isRecording}
      isPaused={isPaused}
      SendAudio={SendAudio}

      
      onCancel={handleCancelRecording}
      sendMessage={sendMessage}
    />
  ) : (
    // ✉️ Traditional Input UI
    <>
      {/* Emoji Button */}
      <button
        type="button"
        className="btn p-0"
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "12px",
          backgroundColor: "#1f2228",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "#cbd5f5",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center"
        }}
        onClick={toggleEmojiPicker}
        ref={buttonRefemoji}
      >
        😊
      </button>

      {/* Text Input + File Attach */}
      <div className="flex-grow-1 position-relative d-flex align-items-center gap-2">
        <input
          disabled={isTargetBlocked}
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
       
         className="flex-grow p-2 rounded-md focus:outline-none"
	  placeholder={  isTargetBlocked ? 'You blocked this user' : 'Type a message'}
          style={{
            borderRadius: "18px",
            color: "#e5e7eb",
            backgroundColor: "#1f2228",
            border: "1px solid rgba(255,255,255,0.08)",
            padding: "10px 14px",
            width: "100%",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)"
          }}
        />

        {/* File Attach Button */}
        { !newMessage && (
        <button
          type="button"
          className="btn p-0"
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "12px",
            backgroundColor: "#1f2228",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#8ab4ff",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center"
          }}
          onClick={toggleFileOptions}
        >
          <FaPaperclip style={{ fontSize: "1.1rem", color: "#8ab4ff" }} />
        </button>)}
              {showEmojiPicker && (
        <div
         ref={pickerRef}
      style={{
      position: 'absolute',
      bottom: '80px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 2000,
      boxShadow: '0px 8px 24px rgba(0,0,0,0.25)',
    }}
        >
          <EmojiPicker onEmojiClick={handleEmojiClick} />
        </div>
      )}

        {/* File Options Popup */}
        {showFileOptions && (
          <div
            className="position-absolute"
            style={{
              bottom: "70px",
              right: "0px",
              background: "rgba(33, 36, 41, 0.98)",
              padding: "10px",
              zIndex: 200,
              display: "flex",
              flexDirection: "row",
              gap: "10px",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "14px",
              boxShadow: "0px 10px 26px rgba(0, 0, 0, 0.35)",
              backdropFilter: "blur(8px)"
            }}
          >
            {/* Image/Video */}
            <button
              type="button"
              className="btn p-0"
              style={{
                backgroundColor: "#1f2228",
                color: "#8ab4ff",
                borderRadius: "12px",
                width: "44px",
                height: "44px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(255,255,255,0.08)"
              }}
              onClick={handlePickMedia}
            >
              <FaImage style={{ fontSize: "1.25rem" }} />
            </button>

            {/* Document */}
         {/*   <button
              type="button"
              className="btn"
              style={{
                backgroundColor: "#e0ffe0",
                color: "#28a745",
                borderRadius: "50%",
                width: "55px",
                height: "55px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={handlePickDocument}
            >
              <FaFileAlt style={{ fontSize: "1.6rem" }} />
            </button> */}
          </div>
        )}

        {/* Hidden File Inputs */}
        <input
          type="file"
          ref={imageVideoInputRef}
          onChange={handleMediaSelect}
          multiple
          className="d-none"
          accept="image/*,video/*"
        />
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelection}
          multiple
          className="d-none"
          accept=".pdf,.txt,.doc,.docx,.xls,.xlsx"
        />
      </div>

      {/* Traditional Send Button */}
      <button
        type="submit"
        className="btn ms-2"
        style={{
          backgroundColor: "#3B82F6",
          color: "white",
          borderRadius: "16px",
          padding: "10px 16px",
          fontSize: "0.95rem",
          fontWeight: 600,
          border: "none",
          minWidth: "72px",
          boxShadow: "0 6px 14px rgba(59,130,246,0.35)"
        }}
  onMouseDown={handlePressStart2}
  onMouseUp={handlePressEnd2}
  onMouseLeave={handlePressCancel}
  onTouchStart={handlePressStart2}
  onTouchEnd={handlePressEnd2}
  onClick={() => {
    if (!isRecording) sendMessage(); // send normally if not recording
  }}
>
  {isRecording ? "Recording..." : "Send"}
      </button>
    </>
  )}
</form>




{previewVideo && (
  <div
    className="video-fullscreen"
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100dvh",
      zIndex: 9999,
      backgroundColor: "black",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    <VideoPlayerPlyrWithResolve
      source={{
        type: "video",
        sources: [{ src: previewVideo }],


      }}
      src={previewVideo.file_path || URL.createObjectURL(previewVideo)}
      Name ={previewVideo.file_name}
      Size={previewVideo.file_size} 
      options={{
        controls: ["play", "progress", "current-time", "fullscreen"],
      }}
    />
    <button
      onClick={closeVideoPreview}
      style={{
        position: "absolute",
        top: "10px",
        left: "10px",
        color: "white",
        backgroundColor: "black",
        padding: "10px",
      }}
    >
      Back
    </button>
  </div>
)}

   {/* Media picker preview (display selected media files) */}
    {/* Media Preview */}


   {showMediaPreview && (
  <div
    className="fixed top-0 left-0 w-full h-full bg-black flex flex-col items-center justify-center"
    style={{ zIndex: 100000 }}
  >
    {/* ❌ Close Button */}
    <button
      onClick={() => {
        setShowMediaPreview(false);
        setMediaFiles([]);
        setActiveMediaIndex(0);
      }}
      className="absolute top-4 left-4 z-50 w-10 h-10 flex items-center justify-center bg-black bg-opacity-60 hover:bg-opacity-90 text-white rounded-full text-lg"
    >
      <MdClose size={20} />
    </button>

    {/* 🗑️ Delete Button */}
    {mediaFiles.length > 0 && (
      <button
        onClick={() => {
          const updatedFiles = mediaFiles.filter((_, i) => i !== activeMediaIndex);
          setMediaFiles(updatedFiles);
          if (activeMediaIndex >= updatedFiles.length) {
            setActiveMediaIndex(Math.max(0, updatedFiles.length - 1));
          }
          if (updatedFiles.length === 0) {
            setShowMediaPreview(false);
          }
        }}
        className="absolute top-4 left-16 z-50 w-10 h-10 flex items-center justify-center bg-black bg-opacity-60 hover:bg-opacity-90 text-white rounded-full text-lg"
      >
        <MdDeleteSweep size={20} />
      </button>
    )}

    {/* 📤 Share/Upload */}
    <button
      onClick={handleClosePreview}
      className="absolute top-4 right-4 z-50 w-10 h-10 flex items-center justify-center bg-black bg-opacity-60 hover:bg-opacity-90 text-white rounded-full text-lg"
    >
      <FaPaperPlane size={18} />
    </button>

    {/* MAIN PREVIEW */}
    <div className="flex-1 flex items-center justify-center w-full">
      <div
        style={{
          width: "100%",
          maxWidth: "min(92vw, 520px)",
          aspectRatio: "9 / 16",
          maxHeight: "80vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {mediaFiles[activeMediaIndex]?.type?.startsWith("image/") ? (
          <ImageRenderer
            src={mediaFiles[activeMediaIndex].previewUrl || mediaFiles[activeMediaIndex].preview}
            alt="preview"
            zoomable
            maxZoom={4}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
            onClick={() => {}}
          />
        ) : (
          <video
            src={mediaFiles[activeMediaIndex].previewUrl || mediaFiles[activeMediaIndex].preview} // ✅ safe preview
            controls
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        )}
      </div>
    </div>

    {/* THUMBNAILS */}
    <div className="w-full py-2 z-50 px-3 bg-black overflow-x-auto flex gap-2 border-t border-gray-700">
      {console.log(JSON.stringify(mediaFiles, null, 2))}
      {mediaFiles.map((file, index) => (
        <div
          key={index}
          onClick={() => setActiveMediaIndex(index)}
          className={`w-16 h-16 rounded-md overflow-hidden border-2 relative ${
            index === activeMediaIndex ? "border-white" : "border-gray-600"
          }`}
        >
          {/* Small close button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              const updatedFiles = mediaFiles.filter((_, i) => i !== index);
              setMediaFiles(updatedFiles);
              if (index === activeMediaIndex) setActiveMediaIndex(0);
              if (updatedFiles.length === 0) setShowMediaPreview(false);
            }}
            className="absolute top-1 right-1 z-10 bg-black bg-opacity-60 hover:bg-opacity-90 text-white w-5 h-5 text-xs flex items-center justify-center rounded-full"
          >
            <MdClose size={12} />
          </button>

          {file.type.startsWith("image/") ? (
            <img
              src={file.previewUrl || file.preview} // ✅ safe preview
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <video
              src={file.previewUrl || file.preview} // ✅ safe preview
              className="w-full h-full object-cover"
            />
          )}
        </div>
      ))}
    </div>
  </div>
)}

{fileUploadError && (
  <div
    onClick={() => setFileUploadError(false)}
    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
  >
    <div
      onClick={(e) => e.stopPropagation()}
      className="bg-white p-4 rounded-md shadow-md max-w-xs w-full text-center"
    >
      <p className="text-red-600 font-semibold mb-4">Failed to upload the file.</p>
      <button
        onClick={() => setFileUploadError(false)}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        OK
      </button>
    </div>
  </div>
)}
{fileDownloadError && (
  <div
    onClick={() => setFileDownloadError(false)}
    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
  >
    <div
      onClick={(e) => e.stopPropagation()}
      className="bg-white p-4 rounded-md shadow-md max-w-xs w-full text-center"
    >
      <p className="text-red-600 font-semibold mb-4">
        Failed to download the file.
      </p>
      <button
        onClick={() => setFileDownloadError(false)}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        OK
      </button>
    </div>
  </div>
)}
{prodilepicBIg && (
  <div className="image-modal" onClick={() => setprodilepicBIg(false)}>
    <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
   
      <button className="back-button" onClick={() => setprodilepicBIg(false)}>

        <img src="/pain.png"
          className="w-9 h-9"  
        />
      </button>
      <div className="aspect-container">
        <ImageRenderer
          src={userdetails.avatar}
          alt="Profile Full"
          zoomable
          maxZoom={4}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
          onClick={() => {}}
        />
      </div>
    </div>
  </div>
)}



        </div>
    );
};

export default Chatwindo;


