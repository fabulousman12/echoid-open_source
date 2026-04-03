import React, { createContext, useState, useEffect, useRef } from 'react';
import { isPlatform } from '@ionic/react';
import {  CapacitorSQLite,SQLiteDBConnection } from '@capacitor-community/sqlite';
import Maindata from '../data';
const WebSocketContext = createContext();

 const WebSocketProvider = ({ children }) => {
  
  

  // Store message in SQLite
  
  const storeMessageInSQLite = async (db, message) => {
    console.log("onto savibg",db,message)
    

    return new Promise((resolve, reject) => {
      try {
        // Check for valid DB instance
      if (!db || typeof db.transaction !== 'function') {
    const err = new Error('Database is undefined or invalid');
    console.error('❌ Invalid DB instance passed to storeMessageInSQLite:', db);
    reject(err);  // reject instead of throw
    return;
  }

  
        // Log message details before inserting
 // Beautified JSON output
  
        // Generating unique message ID
        db.transaction(tx => {
          tx.executeSql(`
            INSERT OR REPLACE INTO messages (
              id, sender, recipient, content, timestamp, status, read, isDeleted, isDownload,
              type, file_name, file_type, file_size, thumbnail, file_path, isSent, isError, encryptedMessage,encryptedAESKey,eniv,isReplyTo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?,?,?)
          `, [
            message.id,
            message.sender,
            message.recipient,
            message.content || null,
            new Date(message.timestamp).toISOString(),
            message.status || 'pending',
            message.read ? 1 : 0,
            message.isDeleted ? 1 : 0,
            message.isDownload ? 1 : 0,
            message.type || 'messages',
            message.file_name || null,
            message.file_type || null,
            message.file_size || null,
            message.thumbnail || null,
            message.file_path || null,
            message.isSent ? 1 : 0,
            message.isError ? 1 : 0,
            message.encryptedMessage || null,
            message.encryptedAESKey || null,
            message.eniv || null,
            message.isReplyTo || null
          ], 
          () => {
      
            // After inserting the message, fetch and log all messages
           fetchAllMessages(db)
            resolve(message.id); // Resolve with the message ID
            return true
          }, 
          (tx, error) => {
            console.error('Error storing message in SQLite:', error);
            reject(error); // Reject if there’s an error
          });
        });
        
      } catch (error) {
        console.error('Error in storeMessageInSQLite:', JSON.stringify(error));
        reject(error);
      }
    });
    
  };
  
  // Function to fetch and log all messages from SQLite
  const fetchAllMessages = async (db) => {

    return new Promise((resolve, reject) => {
 try {
  db.transaction(tx => {
    tx.executeSql(
      'SELECT * FROM messages',
      [],
      (_, result) => {
   // Log the number of messages
          const messages = [];
          for (let i = 0; i < result.rows.length; i++) {
            messages.push(result.rows.item(i));
          }

    
        resolve(messages);
      },
      (_, error) => {
        console.error('❌ SQL Error:', error);
        reject(error);
      }
    );
  });
} catch (err) {
  console.error('❌ Transaction threw:', err);
  reject(err);
}

    });
  };

  const initGroupMessagesSchema = async (db) => {
    return new Promise((resolve, reject) => {
      try {
        if (!db || typeof db.transaction !== "function") {
          reject(new Error("Database is undefined or invalid"));
          return;
        }
        db.transaction(
          (tx) => {
            tx.executeSql(
              `CREATE TABLE IF NOT EXISTS group_messages (
                id TEXT PRIMARY KEY,
                group_id TEXT NOT NULL,
                sender TEXT NOT NULL,
                message_type TEXT DEFAULT 'text',
                content TEXT,
                media_url TEXT,
                preview_url TEXT,
                is_download INTEGER DEFAULT 0,
                is_reply_to TEXT DEFAULT null,
                timestamp TEXT NOT NULL,
                status TEXT DEFAULT 'sent',
                read_by TEXT DEFAULT '[]',
                updated_at TEXT
              );`,
              []
            );
            tx.executeSql(
              `CREATE INDEX IF NOT EXISTS idx_group_messages_group_time
               ON group_messages(group_id, timestamp DESC);`,
              []
            );
            tx.executeSql(
              `PRAGMA table_info(group_messages);`,
              [],
              (_, result) => {
                const columns = [];
                const rowCount = Number(result?.rows?.length || 0);
                for (let index = 0; index < rowCount; index += 1) {
                  columns.push(result.rows.item(index)?.name);
                }

                if (!columns.includes("is_reply_to")) {
                  tx.executeSql(
                    `ALTER TABLE group_messages ADD COLUMN is_reply_to TEXT DEFAULT null;`,
                    [],
                    () => {},
                    () => false
                  );
                }

                if (!columns.includes("is_download")) {
                  tx.executeSql(
                    `ALTER TABLE group_messages ADD COLUMN is_download INTEGER DEFAULT 0;`,
                    [],
                    () => {},
                    () => false
                  );
                }
              },
              () => false
            );
            tx.executeSql(
              `UPDATE group_messages
               SET is_download = 1
               WHERE COALESCE(is_download, 0) = 0
                 AND media_url IS NOT NULL
                 AND (
                   media_url LIKE 'file:%'
                   OR media_url LIKE 'content:%'
                   OR media_url LIKE 'capacitor:%'
                   OR media_url LIKE '/%'
                   OR media_url LIKE 'group_media/%'
                   OR media_url LIKE 'files/%'
                   OR media_url LIKE 'documents/%'
                   OR media_url LIKE '%/Documents/%'
                 );`,
              []
            );
          },
          (error) => reject(error),
          () => resolve(true)
        );
      } catch (error) {
        reject(error);
      }
    });
  };

  const saveGroupMessageInSQLite = async (db, message) => {
    const ts = new Date(message.timestamp || Date.now()).toISOString();
    const readBy = Array.isArray(message.readBy) ? message.readBy : [];
    return new Promise((resolve, reject) => {
      try {
        if (!db || typeof db.transaction !== "function") {
          reject(new Error("Database is undefined or invalid"));
          return;
        }
        db.transaction((tx) => {
          tx.executeSql(
            `INSERT OR REPLACE INTO group_messages (
              id, group_id, sender, message_type, content, media_url, preview_url, is_download,
              is_reply_to, timestamp, status, read_by, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              String(message.id || message._id),
              String(message.groupId || message.group_id),
              String(message.sender),
              String(message.messageType || message.type || "text"),
              message.content || null,
              message.mediaUrl || null,
              message.previewUrl || null,
              message.isDownload ? 1 : 0,
              message.isReplyTo || message.is_reply_to || null,
              ts,
              message.status || "sent",
              JSON.stringify(readBy),
              new Date().toISOString(),
            ],
            () => resolve(true),
            (_, error) => reject(error)
          );
        });
      } catch (error) {
        reject(error);
      }
    });
  };

  const editGroupMessageInSQLite = async (db, messageId, updates = {}) => {
    const fields = [];
    const values = [];
    const map = {
      content: "content",
      mediaUrl: "media_url",
      previewUrl: "preview_url",
      isDownload: "is_download",
      status: "status",
      messageType: "message_type",
      isReplyTo: "is_reply_to",
      timestamp: "timestamp",
      readBy: "read_by",
    };
    Object.entries(map).forEach(([sourceKey, dbKey]) => {
      if (updates[sourceKey] === undefined) return;
      fields.push(`${dbKey} = ?`);
      if (sourceKey === "readBy") {
        values.push(JSON.stringify(Array.isArray(updates.readBy) ? updates.readBy : []));
      } else if (sourceKey === "timestamp") {
        values.push(new Date(updates.timestamp).toISOString());
      } else {
        values.push(updates[sourceKey]);
      }
    });
    fields.push("updated_at = ?");
    values.push(new Date().toISOString());
    values.push(String(messageId));

    return new Promise((resolve, reject) => {
      if (!fields.length) {
        resolve(false);
        return;
      }
      db.transaction((tx) => {
        tx.executeSql(
          `UPDATE group_messages SET ${fields.join(", ")} WHERE id = ?`,
          values,
          () => resolve(true),
          (_, error) => reject(error)
        );
      });
    });
  };

  const deleteGroupMessageInSQLite = async (db, messageId) =>
    new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          `DELETE FROM group_messages WHERE id = ?`,
          [String(messageId)],
          () => resolve(true),
          (_, error) => reject(error)
        );
      });
    });

  const getGroupMessagesByGroupFromSQLite = async (db, groupId, limit = 30, cursorId = null) => {
    const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 200);
    const cursorClause = cursorId ? "AND id > ?" : "";
    const params = cursorId ? [String(groupId), String(cursorId), safeLimit] : [String(groupId), safeLimit];
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          `SELECT * FROM (
             SELECT * FROM group_messages
             WHERE group_id = ? ${cursorClause}
             ORDER BY timestamp DESC, id DESC
             LIMIT ?
           ) recent_rows
           ORDER BY timestamp ASC, id ASC`,
          params,
          (_, result) => {
            const out = [];
            for (let i = 0; i < result.rows.length; i++) {
              const row = result.rows.item(i);
              out.push({
                id: row.id,
                groupId: row.group_id,
                sender: row.sender,
                messageType: row.message_type || "text",
                content: row.content,
                mediaUrl: row.media_url,
                previewUrl: row.preview_url,
                isDownload: Number(row.is_download || 0) === 1,
                isReplyTo: row.is_reply_to || null,
                timestamp: row.timestamp,
                status: row.status,
                readBy: JSON.parse(row.read_by || "[]"),
              });
            }
            resolve(out);
          },
          (_, error) => reject(error)
        );
      });
    });
  };

  const getGroupMessagesPaginatedByGroupFromSQLite = async (db, limitPerGroup = 30) => {
    const safeLimit = Math.min(Math.max(Number(limitPerGroup) || 30, 1), 200);
    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          `SELECT DISTINCT group_id FROM group_messages`,
          [],
          async (_, result) => {
            try {
              const groupMap = {};
              for (let i = 0; i < result.rows.length; i++) {
                const gid = result.rows.item(i).group_id;
                const rows = await getGroupMessagesByGroupFromSQLite(db, gid, safeLimit);
                groupMap[gid] = rows;
              }
              resolve(groupMap);
            } catch (err) {
              reject(err);
            }
          },
          (_, error) => reject(error)
        );
      });
    });
  };

  const getLatestGroupCursorMapFromSQLite = async (db) =>
    new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          `SELECT gm.group_id, gm.id
           FROM group_messages gm
           INNER JOIN (
             SELECT group_id, MAX(timestamp) AS max_ts
             FROM group_messages
             GROUP BY group_id
           ) latest
           ON latest.group_id = gm.group_id AND latest.max_ts = gm.timestamp`,
          [],
          (_, result) => {
            const cursorMap = {};
            for (let i = 0; i < result.rows.length; i++) {
              const row = result.rows.item(i);
              if (row?.id && row?.group_id) {
                cursorMap[row.id] = row.group_id;
              }
            }
            resolve(cursorMap);
          },
          (_, error) => reject(error)
        );
      });
    });

  const initGroupSummariesSchema = async (db) =>
    new Promise((resolve, reject) => {
      try {
        if (!db || typeof db.transaction !== "function") {
          reject(new Error("Database is undefined or invalid"));
          return;
        }
        db.transaction(
          (tx) => {
            tx.executeSql(
              `CREATE TABLE IF NOT EXISTS group_summaries (
                id TEXT PRIMARY KEY,
                name TEXT,
                description TEXT,
                avatar TEXT,
                owner TEXT,
                unread_count INTEGER DEFAULT 0,
                latest_message TEXT,
                latest_message_timestamp TEXT,
                member_count INTEGER DEFAULT 0,
                is_active INTEGER DEFAULT 1,
                is_deleted INTEGER DEFAULT 0,
                updated_at TEXT
              );`,
              []
            );
            tx.executeSql(
              `ALTER TABLE group_summaries ADD COLUMN is_deleted INTEGER DEFAULT 0;`,
              [],
              () => {},
              () => false
            );
            tx.executeSql(
              `CREATE INDEX IF NOT EXISTS idx_group_summaries_updated
               ON group_summaries(updated_at DESC);`,
              []
            );
          },
          (error) => reject(error),
          () => resolve(true)
        );
      } catch (error) {
        reject(error);
      }
    });

  const upsertGroupSummariesInSQLite = async (db, groups = []) =>
    new Promise((resolve, reject) => {
      try {
        if (!db || typeof db.transaction !== "function") {
          reject(new Error("Database is undefined or invalid"));
          return;
        }
        const normalized = Array.isArray(groups) ? groups : [];
        db.transaction(
          (tx) => {
            for (const group of normalized) {
              const gid = String(group?.id || group?._id || "").trim();
              if (!gid) continue;
              tx.executeSql(
                `INSERT OR REPLACE INTO group_summaries (
                  id, name, description, avatar, owner, unread_count,
                  latest_message, latest_message_timestamp, member_count, is_active, is_deleted, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  gid,
                  group?.name || "",
                  group?.description || "",
                  group?.avatar || "",
                  String(group?.owner || group?.createdBy || ""),
                  Number(group?.unreadCount || 0),
                  group?.latestMessage || "",
                  group?.latestMessageTimestamp
                    ? new Date(group.latestMessageTimestamp).toISOString()
                    : null,
                  Number(group?.memberCount || 0),
                  group?.isActive === false ? 0 : 1,
                  group?.isDelete === true || group?.isDeleted === true ? 1 : 0,
                  group?.updatedAt ? new Date(group.updatedAt).toISOString() : new Date().toISOString(),
                ]
              );
            }
          },
          (error) => reject(error),
          () => resolve(true)
        );
      } catch (error) {
        reject(error);
      }
    });

  const getGroupSummariesFromSQLite = async (db) =>
    new Promise((resolve, reject) => {
      try {
        if (!db || typeof db.transaction !== "function") {
          reject(new Error("Database is undefined or invalid"));
          return;
        }
        db.transaction((tx) => {
          tx.executeSql(
            `SELECT * FROM group_summaries ORDER BY COALESCE(latest_message_timestamp, updated_at) DESC`,
            [],
            (_, result) => {
              const groups = [];
              for (let i = 0; i < result.rows.length; i++) {
                const row = result.rows.item(i);
                groups.push({
                  id: row.id,
                  name: row.name,
                  description: row.description,
                  avatar: row.avatar,
                  owner: row.owner,
                  unreadCount: Number(row.unread_count || 0),
                  latestMessage: row.latest_message || "",
                  latestMessageTimestamp: row.latest_message_timestamp || null,
                  memberCount: Number(row.member_count || 0),
                  isActive: Number(row.is_active || 0) === 1,
                  isDelete: Number(row.is_deleted || 0) === 1,
                  updatedAt: row.updated_at || null,
                });
              }
              resolve(groups);
            },
            (_, error) => reject(error)
          );
        });
      } catch (error) {
        reject(error);
      }
    });

  const deleteGroupSummariesByIds = async (db, groupIds = []) =>
    new Promise((resolve, reject) => {
      try {
        if (!db || typeof db.transaction !== "function") {
          reject(new Error("Database is undefined or invalid"));
          return;
        }
        const ids = Array.isArray(groupIds) ? groupIds.map((id) => String(id)).filter(Boolean) : [];
        if (!ids.length) {
          resolve(false);
          return;
        }
        const placeholders = ids.map(() => "?").join(",");
        db.transaction((tx) => {
          tx.executeSql(
            `DELETE FROM group_summaries WHERE id IN (${placeholders})`,
            ids,
            () => resolve(true),
            (_, error) => reject(error)
          );
        });
      } catch (error) {
        reject(error);
      }
    });
  
  
  
  
  // Update unread count in SQLite
   const updateUnreadCountInSQLite = async (db, sender) => {
    // try {
    //   await db.run(`
    //     INSERT OR REPLACE INTO unreadCount (sender, count)
    //     VALUES (?, (SELECT count + 1 FROM unreadCount WHERE sender = ?))
    //   `, [sender, sender]);
  
    //   console.log('Unread count updated in SQLite');
    // } catch (err) {
    //   console.error('Error updating unread count in SQLite:', err);
    // }
    return new Promise((resolve, reject) => {
      const id = new Date().toISOString();
      db.transaction(tx => {
          tx.executeSql(`
          INSERT OR REPLACE INTO unreadCount (sender, count)
          VALUES (?, (SELECT count + 1 FROM unreadCount WHERE sender = ?))
        `, [sender, sender], 
              () => resolve(id), 
              (tx, error) => reject(error));
      });
  });
  
  };
  
  // Reset unread count in SQLite
   const resetUnreadCountInSQLite = async (db, sender) => {
    // try {
    //   await db.run(`UPDATE unreadCount SET count = 0 WHERE sender = ?`, [sender]);
    //   console.log('Unread count reset in SQLite');
    // } catch (err) {
    //   console.error('Error resetting unread count in SQLite:', err);
    // }
    return new Promise((resolve, reject) => {
      const id = new Date().toISOString();
      db.transaction(tx => {
          tx.executeSql(`UPDATE unreadCount SET count = 0 WHERE sender = ?`, [sender], 
              () => resolve(id), 
              (tx, error) => reject(error));
      });
  });
    
  };
  const getMessagesFromSQLite = async (db, currentUser, limitPerUser) => {

    if (!db) {
      console.error("SQLite database is not initialized.");
      return [];
    }
  
    return new Promise((resolve, reject) => {
      // Step 1: Get the list of other users
    // Log start of fetching
      db.transaction(tx => {
        tx.executeSql(
          `SELECT DISTINCT CASE
                               WHEN sender = ? THEN recipient
                               ELSE sender
                             END AS other_userid
           FROM messages
           WHERE sender = ? OR recipient = ?`,
          [currentUser, currentUser, currentUser],
          (tx, results) => {
            const otherUserIds = [];
            for (let i = 0; i < results.rows.length; i++) {
              otherUserIds.push(results.rows.item(i).other_userid);
            }
  
        //    console.log("Other userIds fetched:", JSON.stringify(otherUserIds)); // Log the userIds fetched
  
            // Step 2: Fetch the latest 45 messages between the currentUser and each other user
            const messagesPromises = otherUserIds.map(userId =>
              new Promise((resolveMessages, rejectMessages) => {
                tx.executeSql(
                  `SELECT id, sender, recipient, content, timestamp, status, read,
       isDeleted, isDownload, type, file_name, file_type, file_size,
       thumbnail, file_path, isSent, isError,encryptedMessage,encryptedAESKey,eniv,isReplyTo
                   FROM messages
                   WHERE (sender = ? AND recipient = ?) OR (sender = ? AND recipient = ?)
                   ORDER BY timestamp DESC
                   LIMIT ?`,
                  [currentUser, userId, userId, currentUser, limitPerUser],
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
                        read: row.read ,
                        isDeleted: row.isDeleted ,
                        isDownload: row.isDownload ,
                        type: row.type,
                        file_name: row.file_name === 'null' ? null : row.file_name,
                        file_type: row.file_type === 'null' ? null : row.file_type,
                        file_size: row.file_size,
                        thumbnail: row.thumbnail === 'null' ? null : row.thumbnail,
                        file_path: row.file_path === 'null' ? null : row.file_path,
                        isSent: row.isSent ,
                        isError: row.isError ,
                        encryptedMessage: row.encryptedMessage === 'null' ? null : row.encryptedMessage,
                        encryptedAESKey: row.encryptedAESKey === 'null' ? null : row.encryptedAESKey,
                        eniv : row.eniv === 'null' ? null : row.eniv,
                        isReplyTo: row.isReplyTo === 'null' ? null : row.isReplyTo
                      });
                    }
                  //  console.log(`Messages for user ${userId}:`, messages); // Log the messages for each user
                    resolveMessages(messages);
                  },
                  (tx, error) => {
                    console.error("Error fetching messages for user", userId, error); // Log errors specific to each user fetch
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
          //      console.log("All messages fetched (before sorting):", flatMessages); // Log all messages before sorting
  
                // Sort messages by timestamp ASC
                flatMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                
             //   console.log("All messages fetched and sorted:",flatMessages); // Log the final sorted messages
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
  
   const getALLMessagesFromSQLite = async (db) => {
   
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
          tx.executeSql(
        `  SELECT id, sender, recipient, content, timestamp, status, read 
          FROM messages 
          ORDER BY timestamp ASC`
        , [], 
              (tx, results) => {
                const messages = results.map(row => ({
                  id: row.id,
                  sender: row.sender,
                  recipient: row.recipient,
                  content: row.content,
                  timestamp: new Date(row.timestamp).toISOString(), // Convert back to ISO string if needed
                  status: row.status,
                  read: row.read === 1,  // Convert read flag back to boolean
                }));
            
                  resolve(messages);
              }, 
              (tx, error) => reject(error));
      });
  });
  }; 
  
  
  
  const getunreadcount = async (db) => {
  
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
          tx.executeSql(`
          SELECT id, sender, recipient, content, timestamp, status, read 
          FROM messages 
          ORDER BY timestamp ASC
        `, [], 
              (tx, results) => {
                const messages = results.map(row => ({
                  id: row.id,
                  sender: row.sender,
                  recipient: row.recipient,
                  content: row.content,
                  timestamp: new Date(row.timestamp).toISOString(), // Convert back to ISO string if needed
                  status: row.status,
                  read: row.read === 1,  // Convert read flag back to boolean
                }));
            
                  resolve(messages);
              }, 
              (tx, error) => reject(error));
      });
  });
  };
  

  return (
    <WebSocketContext.Provider
      value={{
        storeMessageInSQLite,
        initGroupMessagesSchema,
        saveGroupMessageInSQLite,
        editGroupMessageInSQLite,
        deleteGroupMessageInSQLite,
        getGroupMessagesByGroupFromSQLite,
        getGroupMessagesPaginatedByGroupFromSQLite,
        getLatestGroupCursorMapFromSQLite,
        initGroupSummariesSchema,
        upsertGroupSummariesInSQLite,
        getGroupSummariesFromSQLite,
        deleteGroupSummariesByIds,
        updateUnreadCountInSQLite,
        getALLMessagesFromSQLite,
        getunreadcount,
        getMessagesFromSQLite,
        fetchAllMessages,
 
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export { WebSocketContext, WebSocketProvider };

