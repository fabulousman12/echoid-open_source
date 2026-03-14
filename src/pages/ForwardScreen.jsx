import React, { useEffect, useState } from 'react';
import { useLocation, } from 'react-router-dom';
import { IonIcon } from '@ionic/react';
import { searchOutline, closeOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { isPlatform } from '@ionic/react';
import Maindata from '../data';
import { getAccessToken } from "../services/authTokens";
import forge from 'node-forge';
const ForwardScreen = ({socket,messagesRef,host,saveMessage,db,storeMessageInSQLite,setUsersMain}) => {
  const location = useLocation();
  const history = useHistory();
  const { forwardedMessages } = location.state || {}; // Get messages/files to forward

  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);

  useEffect(() => {
    const userData = globalThis.storage.readJSON('usersMain', []) || [];
    setUsers(userData);

    console.log("satte",forwardedMessages)
  }, []);

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
 const getkey = async (userDetails,token) => {
  let key = userDetails.publicKey;

  if (!key) {
    try {
      const response = await fetch(`https://${Maindata.SERVER_URL}/user/getPublicKey/${userDetails.id}`, {
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
          if (user.id === userDetails.id) {
            return { ...user, publicKey: key };
          }
          return user;
        });

        globalThis.storage.setItem("usersMain", JSON.stringify(updatedUsers));
        // Optionally: update userdetails in your state/UI too
        setUsersMain(updatedUsers);
      }
    } catch (error) {
      console.error("Failed to fetch public key:", error);
    }
  }

  return key;
};
  const handleUserClick = (user) => {
    const isSelected = selectedUsers.some(u => u.id === user.id);
    if (isSelected) {
      setSelectedUsers(prev => prev.filter(u => u.id !== user.id));
    } else {
      setSelectedUsers(prev => [...prev, user]);
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };
      const generateMessageId = (userId) => {
  console.log(userId)
        const shortUuid = nanoid(4);
  
        // Get the current date in YYMMDDHHMM format
        const currentDate = new Date();
        const iso = currentDate.toISOString();
        const formattedDate = iso.replaceAll('-', '').replaceAll(':', '').replaceAll('T', '').slice(0, 12);
  
  
        // Combine nanoid, date, and userId
        return `${shortUuid}${formattedDate}-${userId.slice(-6)}`;
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

      const handleForward = async () => {
        if (selectedUsers.length === 0) return;
      
        if (!Array.isArray(forwardedMessages)) {
          console.error('No forwarded messages found!');
          return;
        }
      
        const token = await getAccessToken();
        let user = globalThis.storage.getItem('currentuser');
        user = JSON.parse(user);
      
        // Use a for...of loop to handle async operations properly
        for (const message of forwardedMessages) {

          let isError = 0;
          const messageId = generateMessageId(user._id);
          console.log('messageid', messageId);
      
          let messageTosend = null;
          
          if (message.type === 'file') {
            // Await the file upload and thumbnail generation
            const signedUrl = await uploadFile(message, token); // Assuming uploadFile is async
            console.log(`✅ Signed URL for ${message.file_name}:`, signedUrl);
            if (!signedUrl || typeof signedUrl.uploadUrl !== 'string' || !signedUrl.uploadUrl.trim()) {
            isError = 1;
            }
            
            // Generate thumbnail if image or video, await if needed
            let thumbnail = null;
            if (message.file_type === 'image' || message.file_type === 'video') {
              thumbnail = await generateThumbnail(message); // Assuming generateThumbnail is async
              console.log(`📸 Generated thumbnail for ${message}`);
            }
      
            const timestamp = new Date().toISOString();
      
            messageTosend = {
              id: messageId,
              sender: user._id,
              thumbnail,
              content: null,
              timestamp,
              status: "pending",
              read: 0,
              isDeleted: 0,
              type: "file",
              file_path: signedUrl,
              file_name: message.file_name,
              file_type: message.file_type,
              file_size: message.file_size,
              file_localstate: message.file_path,
              encryptedMessage,
              encryptedAESKey
              
            };
          } else {

            const idd = messageId;
      
            messageTosend = {
              type: 'messages',
              id: idd,
              sender: user._id,
              content: message.content,
              read: 0,
              timestamp: new Date().toISOString(),
              status: 'pending',
              isDeleted: 0,
              isDownload: 0,
              Megtype: 'text',
              file_name: null,
              file_type: null,
              file_size: null,
              thumbnail: null,
              file_path: null,
              encryptedMessage: '',
              encryptedAESKey: '',
            };
          }
      
          // Process the message for each selected user
          for (const usersent of selectedUsers) {
                     const aesKey = forge.random.getBytesSync(32); // 256-bit
            
                // 2. Encrypt message with AES
                const { iv, ciphertext } = encryptWithAES(messageTosend.content, aesKey);
                const encryptedMessage = forge.util.encode64(iv + ciphertext);
            const encrptedtext = await encryptMessageHybrid(message.content, user.publicKey);
                // 3. Encrypt AES key with recipient’s RSA public key
   
            const messageData = {
              messageId: messageTosend.id,
              sender: user._id,
              recipient: usersent.id,
              content: messageTosend.content,
              timestamp: new Date().toISOString(),
              status: "pending",
              read: 0,
              isDeleted: 0,
              type: messageTosend.type,
              file_path: messageTosend.file_path,
              file_name: messageTosend.file_name,
              thumbnail: messageTosend.thumbnail,
              isDownload: 0,
              file_type: messageTosend.file_type,
              file_size: messageTosend.file_size,
              encryptedMessage: encrptedtext.ciphertext,
              encryptedAESKey: encrptedtext.encryptedAesKey,
              eniv:encrptedtext.iv,
              
            };
      
            const messageDataLocal = {
              messageId: messageTosend.id,
              sender: user._id,
              recipient: usersent.id,
              content: messageTosend.content,
              timestamp: new Date().toISOString(),
              status: "pending",
              read: 0,
              isDeleted: 0,
              isDownload: 1,
              type: messageTosend.type,
              file_path: messageTosend.file_localstate,
              file_name: messageTosend.file_name,
              file_type: messageTosend.file_type,
              file_size: messageTosend.file_size,
              isError,
              thumbnail: messageTosend.thumbnail,
             encryptedMessage: encrptedtext.ciphertext,
              encryptedAESKey: encrptedtext.encryptedAesKey,
              eniv:encrptedtext.iv,
            };
      
            console.log("messageData", messageData);
            const result = await saveMessage(messageData);

            if (result?.status === 'sent') {
              messageDataLocal.isSent = 1;
            } else {
              messageDataLocal.isSent = 0;
            }
      
            if (messageData.type === 'file') {
              if (isPlatform('hybrid')) {
                storeMessageInSQLite(db.current, messageDataLocal);
              } else {
                const messages = globalThis.storage.readJSON("messages", null) || [];
                messages.push(messageDataLocal);
                globalThis.storage.setItem("messages", JSON.stringify(messages));
              }
      
              console.log("saved message", messageDataLocal);
              messagesRef.current = [...messagesRef.current, messageDataLocal];
            }
          }
        }
      
        // After processing all forwards
        history.goBack();
      };
      

      const getBlobFromPath = (nativePath) => {
  return new Promise((resolve, reject) => {
    window.resolveLocalFileSystemURL(nativePath, (fileEntry) => {
      fileEntry.file((file) => {
        resolve(file); // file is a Blob and has type, name, etc.
      }, (error) => {
        reject(`Error getting file from entry: ${error.code}`);
      });
    }, (error) => {
      reject(`Error resolving file system URL: ${error.code}`);
    });
  });
};

const uploadFile = async (file, token) => {
  try {
    const fileData = await getBlobFromSandboxPath(file.path);
    const uint8View = new Uint8Array(fileData);

    const response = await fetch(`https://${Maindata.SERVER_URL}/messages/upload-to-b2`, {
      method: 'POST',
      headers: {
        'Auth': token,
        'X-Filename': file.name,
        'X-Filesize': file.size.toString(),
        'Content-Type': 'application/octet-stream'
      },
      body: uint8View
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Upload failed: ${response.status} - ${errorText}`);
      return null;
    }

    const result = await response.json();
    return {
      fileId: result.fileId,
      fileName: result.fileName,
      fileUrl: result.fileUrl
    };
  } catch (error) {
    console.error('🚨 Error uploading file:', error.message);
  }
};
const getBlobFromSandboxPath = async (nativePath) => {
  // remove file:// prefix if exists
  try {
    const pathWithPrefix = nativePath.startsWith("file://")
      ? nativePath
      : `file://${nativePath}`;
    const response = await fetch(pathWithPrefix);
    if (!response.ok) throw new Error("Failed to fetch file from path");
    return await response.blob();
  } catch (err) {
    console.error("Error fetching blob from native path:", err);
    throw err;
  }
};

const generateThumbnail = async (file) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (file.type.startsWith("image/")) {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = 64;
            canvas.height = 64;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, 64, 64);
            canvas.toBlob(
              (blob) => {
                blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)));
              },
              "image/jpeg",
              0.5
            );
          };
          img.src = e.target.result;
        };

        reader.onerror = reject;
        reader.readAsDataURL(file);
      } else if (file.type.startsWith("video/")) {
        const response = await fetch(file.path); // fetch from Android path
        const blob = await response.blob();
        const video = document.createElement("video");
        video.preload = "metadata";
        video.muted = true;
        video.src = URL.createObjectURL(blob);

        video.onloadedmetadata = async () => {
          const duration = video.duration;
          await new Promise((res) => {
            video.onseeked = res;
            video.currentTime = duration / 2;
          });

          const canvas = document.createElement("canvas");
          canvas.width = 64;
          canvas.height = 64;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(video, 0, 0, 64, 64);
          canvas.toBlob(
            (thumbBlob) => {
              thumbBlob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)));
              URL.revokeObjectURL(video.src); // clean up
            },
            "image/jpeg",
            0.5
          );
        };

        video.onerror = reject;
      } else {
        resolve(null); // unsupported type
      }
    } catch (err) {
      reject(err);
    }
  });
};

  

  return (
    <div style={{ height: '100dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-primary text-white">
        <button onClick={() => history.goBack()}>
          <IonIcon icon={closeOutline} size="large" />
        </button>
        
        {selectedUsers.length > 0 && <button onClick={handleForward} disabled={selectedUsers.length === 0}>
          Forward
        </button>}
      </div>

      {/* Search */}
      <div className="p-2 flex items-center bg-gray-100">
        <IonIcon icon={searchOutline} size="small" className="mr-2 text-gray-500" />
        <input
          type="text"
          placeholder="Search users"
          value={searchQuery}
          onChange={handleSearchChange}
          className="flex-1 p-2 rounded bg-white border"
        />
      </div>

      {/* Users List */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredUsers.map(user => {
          const isSelected = selectedUsers.some(u => u.id === user.id);

          return (
            <div
              key={user.id}
              className="list-group-item user-card d-flex justify-content-between align-items-center"
              style={{
                position: 'relative',
                marginBottom: '10px',
                backgroundColor: isSelected ? '#cce5ff' : '',
                cursor: 'pointer',
              }}
              onClick={() => handleUserClick(user)}
            >
              <img
                src={user.avatar || 'https://via.placeholder.com/48'}
                alt={user.name}
                className="rounded-circle"
                style={{ marginRight: '10px', width: '48px', height: '48px' }}
              />
              <div className="flex-grow-1">
                <h6 className="mb-0">{user.name}</h6>
                <small className="text-muted">{user.lastMessage || 'No message'}</small>
              </div>
              <div className="text-right">
                {user.unreadCount > 0 && <span className="badge bg-primary">{user.unreadCount}</span>}
                <small className="text-muted d-block">
                  {user.timestamp ? new Date(user.timestamp).toLocaleTimeString() : ''}
                </small>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ForwardScreen;

