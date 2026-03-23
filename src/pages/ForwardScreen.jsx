import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { IonIcon } from '@ionic/react';
import { closeOutline, searchOutline } from 'ionicons/icons';
import { isPlatform } from '@ionic/react';
import { nanoid } from 'nanoid';
import Maindata from '../data';
import { getAccessToken } from '../services/authTokens';
import { isWebStoredFileRef, readWebStoredFileAsUint8Array } from '../services/webFileStore';

const generateMessageId = (userId = '') => {
  const shortUuid = nanoid(4);
  const iso = new Date().toISOString();
  const formattedDate = iso.replaceAll('-', '').replaceAll(':', '').replaceAll('T', '').slice(0, 12);
  return `${shortUuid}${formattedDate}-${String(userId).slice(-6)}`;
};

const pemToArrayBuffer = (pem) => {
  const b64 = String(pem || '')
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s+/g, '');
  const binaryString = atob(b64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
};

async function encryptMessageHybrid(newMessage, recipientPublicKeyPem) {
  const publicKeyBuffer = pemToArrayBuffer(recipientPublicKeyPem);
  const publicKey = await window.crypto.subtle.importKey(
    'spki',
    publicKeyBuffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  );

  const aesKey = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedMessage = new TextEncoder().encode(newMessage);
  const encryptedMessageBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    encodedMessage
  );
  const rawAesKey = await window.crypto.subtle.exportKey('raw', aesKey);
  const encryptedAesKeyBuffer = await window.crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    rawAesKey
  );

  return {
    encryptedAesKey: arrayBufferToBase64(encryptedAesKeyBuffer),
    iv: arrayBufferToBase64(iv.buffer),
    ciphertext: arrayBufferToBase64(encryptedMessageBuffer),
  };
}

const normalizeForwardFilePath = (message) =>
  message?.file_localstate || message?.file_path || message?.path || '';

const normalizeForwardFileName = (message) =>
  message?.file_name || message?.name || `forwarded_${Date.now()}`;

const normalizeForwardFileType = (message) =>
  String(message?.file_type || message?.mimeType || '').toLowerCase();

const normalizeForwardContent = (message) =>
  typeof message?.content === 'string' ? message.content : '';

const ForwardScreen = ({
  messagesRef,
  saveMessage,
  db,
  storeMessageInSQLite,
  setUsersMain,
}) => {
  const location = useLocation();
  const history = useHistory();
  const { forwardedMessages } = location.state || {};

  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isForwarding, setIsForwarding] = useState(false);

  useEffect(() => {
    const userData = globalThis.storage.readJSON('usersMain', []) || [];
    setUsers(Array.isArray(userData) ? userData : []);
  }, []);

  const filteredUsers = useMemo(
    () =>
      users.filter((user) =>
        String(user?.name || '')
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      ),
    [users, searchQuery]
  );

  const getkey = async (userDetails, token) => {
    let key = userDetails.publicKey;

    if (!key) {
      try {
        const response = await fetch(`https://${Maindata.SERVER_URL}/user/getPublicKey/${userDetails.id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Auth: token,
          },
        });

        const data = await response.json();
        if (data.success && data.publicKey) {
          key = data.publicKey;
          let usersMain = globalThis.storage.readJSON('usersMain', null) || [];
          if (!Array.isArray(usersMain)) usersMain = [usersMain];
          const updatedUsers = usersMain.map((user) =>
            user.id === userDetails.id ? { ...user, publicKey: key } : user
          );
          globalThis.storage.setItem('usersMain', JSON.stringify(updatedUsers));
          setUsersMain(updatedUsers);
          setUsers(updatedUsers);
        }
      } catch (error) {
        console.error('Failed to fetch public key:', error);
      }
    }

    return key;
  };

  const getBytesFromPath = async (path) => {
    if (!path) throw new Error('Missing file path');
    if (isWebStoredFileRef(path)) {
      const bytes = await readWebStoredFileAsUint8Array(path);
      if (!bytes?.length) throw new Error('Stored browser file not found');
      return bytes;
    }
    if (/^(blob:|data:|https?:)/i.test(path)) {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`Failed to fetch file: ${response.status}`);
      return new Uint8Array(await (await response.blob()).arrayBuffer());
    }
    const pathWithPrefix = path.startsWith('file://') ? path : `file://${path}`;
    const response = await fetch(pathWithPrefix);
    if (!response.ok) throw new Error('Failed to fetch file from path');
    return new Uint8Array(await (await response.blob()).arrayBuffer());
  };

  const uploadFile = async (file, token) => {
    try {
      const bytes = await getBytesFromPath(file.path);
      const response = await fetch(`https://${Maindata.SERVER_URL}/messages/upload-to-b2`, {
        method: 'POST',
        headers: {
          Auth: token,
          'X-Filename': file.name,
          'X-Filesize': String(file.size || bytes.length || 0),
          'Content-Type': 'application/octet-stream',
        },
        body: bytes,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Upload failed: ${response.status} - ${errorText}`);
        return null;
      }

      const result = await response.json();
      return {
        fileId: result.fileId,
        fileName: result.fileName,
        fileUrl: result.fileUrl,
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    }
  };

  const handleUserClick = (user) => {
    const isSelected = selectedUsers.some((u) => u.id === user.id);
    setSelectedUsers((prev) =>
      isSelected ? prev.filter((u) => u.id !== user.id) : [...prev, user]
    );
  };

  const appendLocalMessage = async (messageDataLocal) => {
    const dbHandle = db?.current || db;
    if (isPlatform('hybrid') && dbHandle) {
      await storeMessageInSQLite(dbHandle, messageDataLocal);
    } else {
      const messages = globalThis.storage.readJSON('messages', null) || [];
      messages.push(messageDataLocal);
      globalThis.storage.setItem('messages', JSON.stringify(messages));
    }
    messagesRef.current = [...(messagesRef.current || []), messageDataLocal];
  };

  const handleForward = async () => {
    if (selectedUsers.length === 0 || !Array.isArray(forwardedMessages)) return;

    setIsForwarding(true);
    try {
      const token = await getAccessToken();
      let currentUser = globalThis.storage.getItem('currentuser');
      currentUser = currentUser ? JSON.parse(currentUser) : null;
      if (!currentUser?._id) {
        throw new Error('Current user missing');
      }

      for (const message of forwardedMessages) {
        for (const recipient of selectedUsers) {
          const isFileMessage = message?.type === 'file';
          const messageId = generateMessageId(currentUser._id);
          const timestamp = new Date().toISOString();
          const recipientPublicKey = await getkey(recipient, token);
          const localFilePath = normalizeForwardFilePath(message);
          const fileName = normalizeForwardFileName(message);
          const fileType = normalizeForwardFileType(message);
          const content = normalizeForwardContent(message);
          const thumbnail = typeof message?.thumbnail === 'string' ? message.thumbnail : null;

          let isError = 0;
          let remoteFilePath = null;

          if (isFileMessage) {
            const uploadResult = await uploadFile(
              {
                path: localFilePath,
                name: fileName,
                size: message?.file_size || message?.size || 0,
              },
              token
            );
            remoteFilePath = uploadResult?.fileUrl || '';
            if (!remoteFilePath) isError = 1;
          }

          const encryptedPayload =
            !isFileMessage && content && recipientPublicKey
              ? await encryptMessageHybrid(content, recipientPublicKey)
              : { ciphertext: '', encryptedAesKey: '', iv: '' };

          const messageData = {
            messageId,
            sender: currentUser._id,
            recipient: recipient.id,
            content: isFileMessage ? null : content,
            timestamp,
            status: 'pending',
            read: 0,
            isDeleted: 0,
            isDownload: 0,
            type: isFileMessage ? 'file' : 'messages',
            Megtype: isFileMessage ? undefined : 'text',
            file_path: isFileMessage ? remoteFilePath : null,
            file_name: isFileMessage ? fileName : null,
            file_type: isFileMessage ? fileType : null,
            file_size: isFileMessage ? (message?.file_size || message?.size || null) : null,
            thumbnail: isFileMessage ? thumbnail : null,
            encryptedMessage: encryptedPayload.ciphertext,
            encryptedAESKey: encryptedPayload.encryptedAesKey,
            eniv: encryptedPayload.iv,
          };

          const messageDataLocal = {
            ...messageData,
            id: messageId,
            messageId,
            file_path: isFileMessage ? localFilePath : null,
            isDownload: isFileMessage ? 1 : 0,
            isError,
            isSent: 0,
          };

          const result = await saveMessage(messageData);
          messageDataLocal.isSent = result?.status === 'sent' ? 1 : 0;
          messageDataLocal.isError =
            result?.status === 'sent' ? 0 : ((result?.message?.isError ?? isError) || 1);

          await appendLocalMessage(messageDataLocal);
        }
      }

      history.goBack();
    } catch (error) {
      console.error('Failed to forward messages:', error);
    } finally {
      setIsForwarding(false);
    }
  };

  return (
    <div style={{ height: '100dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="flex items-center justify-between p-4 bg-primary text-white">
        <button onClick={() => history.goBack()}>
          <IonIcon icon={closeOutline} size="large" />
        </button>
        {selectedUsers.length > 0 && (
          <button onClick={handleForward} disabled={isForwarding}>
            {isForwarding ? 'Forwarding...' : 'Forward'}
          </button>
        )}
      </div>

      <div className="p-2 flex items-center bg-gray-100">
        <IonIcon icon={searchOutline} size="small" className="mr-2 text-gray-500" />
        <input
          type="text"
          placeholder="Search users"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 p-2 rounded bg-white border"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {filteredUsers.map((user) => {
          const isSelected = selectedUsers.some((u) => u.id === user.id);
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
