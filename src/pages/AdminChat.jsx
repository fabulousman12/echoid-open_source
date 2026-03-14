import { useEffect, useRef, useState } from "react";
import { BiArrowBack } from "react-icons/bi";
import { FaSyncAlt } from "react-icons/fa";
import { useHistory } from "react-router-dom";

export default function AdminChat({
  fetchAdminMessages,
  sendAdminMessage,
  markAdminMessagesRead,
}) {
  const history = useHistory();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(15);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [cachedCount, setCachedCount] = useState(0);
  const MAX_VISIBLE = 250;
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const scrollRef = useRef(null);
  const initialScrollDone = useRef(false);

  const getMsgId = (msg) => msg?._id || msg?.id || null;

  const sortAdminMessages = (list) => {
    if (!Array.isArray(list)) return [];
    return [...list].sort((a, b) => {
      const ta = Number(a?.timestamp || 0);
      const tb = Number(b?.timestamp || 0);
      if (ta !== tb) return ta - tb;
      const ida = String(getMsgId(a) || "");
      const idb = String(getMsgId(b) || "");
      return ida.localeCompare(idb);
    });
  };

  const saveMessagesToPref = (incoming) => {
    try {
      const existingRaw = globalThis.storage.getItem("admin_messages_cache");
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      const existingArr = Array.isArray(existing) ? existing : [];
      const incomingArr = Array.isArray(incoming) ? incoming : [];

      if (incomingArr.length === 0 && existingArr.length === 0) return;

      const seen = new Set(existingArr.map(getMsgId).filter(Boolean));
      const merged = [...existingArr];
      for (const msg of incomingArr) {
        const id = getMsgId(msg);
        if (!id || !seen.has(id)) {
          merged.push(msg);
          if (id) seen.add(id);
        }
      }

      const sorted = sortAdminMessages(merged);
      globalThis.storage.setItem("admin_messages_cache", JSON.stringify(sorted));
      setCachedCount(sorted.length);
    } catch (err) {
      console.warn("Failed to cache admin messages:", err);
    }
  };

  const setMessagesInPref = (allMessages) => {
    try {
      const sorted = sortAdminMessages(allMessages || []);
      globalThis.storage.setItem("admin_messages_cache", JSON.stringify(sorted));
      setCachedCount(sorted.length);
    } catch (err) {
      console.warn("Failed to save admin messages:", err);
    }
  };

  const toggleSelection = (msg) => {
    const id = getMsgId(msg);
    if (!id) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size === 0) {
        setSelectionMode(false);
      } else {
        setSelectionMode(true);
      }
      return next;
    });
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    try {
      const existingRaw = globalThis.storage.getItem("admin_messages_cache");
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      const existingArr = Array.isArray(existing) ? existing : [];
      const filtered = existingArr.filter((m) => !selectedIds.has(getMsgId(m)));
      setMessagesInPref(filtered);
      setMessages((prev) => prev.filter((m) => !selectedIds.has(getMsgId(m))));
      setSelectedIds(new Set());
      setSelectionMode(false);
    } catch (err) {
      console.warn("Failed to delete admin messages:", err);
    }
  };

  const cancelSelection = () => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  const makeLongPressHandlers = (msg) => {
    let timerId;
    const start = () => {
      timerId = setTimeout(() => {
        setSelectionMode(true);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          const id = getMsgId(msg);
          if (id) next.add(id);
          return next;
        });
      }, 450);
    };
    const clear = () => {
      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
      }
    };
    return {
      onMouseDown: start,
      onMouseUp: clear,
      onMouseLeave: clear,
      onTouchStart: start,
      onTouchEnd: clear
    };
  };

  const applyVisibleCount = (all, count) => {
    if (!Array.isArray(all) || all.length === 0) return [];
    const start = Math.max(all.length - count, 0);
    return all.slice(start);
  };

  const getCachedMessages = () => {
    try {
      const existingRaw = globalThis.storage.getItem("admin_messages_cache");
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      const existingArr = Array.isArray(existing) ? existing : [];
      return sortAdminMessages(existingArr);
    } catch (err) {
      console.warn("Failed to read cached admin messages:", err);
      return [];
    }
  };

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = 0;
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadMessages = async () => {
      const result = await fetchAdminMessages();
      const dbMessages = result?.messages || [];
      if (!isMounted) return;
      let nextMessages = dbMessages;
      if (!dbMessages || dbMessages.length === 0) {
        nextMessages = [
          {
            id: "welcome",
            sender: "admin",
            content:
              "Welcome!\nOnly one developer is working on this so please use gently. And Please be patient.",
            timestamp: Date.now(),
            
          },
          {
            id: "Info",
            sender: "admin",
            content: "Also if you found any bug report to developer .",
            timestamp: Date.now(),
          },
        ];
      }
      if (markAdminMessagesRead) {
        nextMessages = markAdminMessagesRead(nextMessages);
      }
      saveMessagesToPref(nextMessages);
      const initialVisible = applyVisibleCount(nextMessages, visibleCount);
      setMessages(initialVisible);
      if (!initialScrollDone.current) {
        requestAnimationFrame(() => {
          scrollToBottom();
          initialScrollDone.current = true;
        });
      }
    };
    loadMessages();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;

    const msg = {
      id: Date.now(),
      sender: "user",
      recipient: "admin",
      content: input,
      timestamp: Date.now(),
      read:true

    };

    const ok = await sendAdminMessage(input);
    if (ok) {
      setMessages(prev => {
        const next = [...prev, msg];
        saveMessagesToPref([msg]);
        return next;
      });
      setInput("");
    }
};
var num =0
  const handleLoadOlder = () => {
    if (loadingOlder) return;
    num +=1;
  
    if(num<1) return
   
    setLoadingOlder(true);
    try {
      const el = scrollRef.current;
      const prevScrollTop = el ? el.scrollTop : 0;
      const prevMaxScrollTop = el ? Math.max(el.scrollHeight - el.clientHeight, 0) : 0;
      const prevDistanceFromTop = prevMaxScrollTop - prevScrollTop;
      const existingArr = getCachedMessages();
      if (existingArr.length <= visibleCount) {
        return;
      }
      const nextCount = Math.min(visibleCount + 10, MAX_VISIBLE, existingArr.length);
      setVisibleCount(nextCount);
      let nextVisible = applyVisibleCount(existingArr, nextCount);
      if (markAdminMessagesRead) {
        nextVisible = markAdminMessagesRead(nextVisible);
      }
      setMessages(nextVisible);
      if (el) {
        setTimeout(() => {
          const nextMaxScrollTop = Math.max(el.scrollHeight - el.clientHeight, 0);
          el.scrollTop = Math.max(nextMaxScrollTop - prevDistanceFromTop, 0);
        }, 50);
      }
    } catch (err) {
      console.warn("Failed to load older admin messages:", err);
    } finally {
      setLoadingOlder(false);
    }
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    let timeoutId;
    try {
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("Refresh timeout")), 15000);
      });
      const result = await Promise.race([fetchAdminMessages(), timeoutPromise]);
      const dbMessages = result?.messages || [];
      let nextMessages = dbMessages;
      if (!dbMessages || dbMessages.length === 0) {
        nextMessages = [
          {
            id: "welcome",
            sender: "admin",
            content:
              "Welcome!\nOnly one developer is working on this so please use gently. And Please be patient.",
            timestamp: Date.now(),
          },
          {
            id: "Info",
            sender: "admin",
            content: "Also if you found any bug report to developer .",
            timestamp: Date.now(),
          },
        ];
      }
      if (markAdminMessagesRead) {
        nextMessages = markAdminMessagesRead(nextMessages);
      }
      saveMessagesToPref(nextMessages);
      const nextVisible = applyVisibleCount(nextMessages, visibleCount);
      setMessages(nextVisible);
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    } catch (err) {
      console.warn("Failed to refresh admin messages:", err);
    } finally {
      clearTimeout(timeoutId);
      setIsRefreshing(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-900 text-gray-200">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-950 border-b border-slate-700">
        <div className="flex items-center gap-3">
          {selectionMode ? (
            <button
              onClick={cancelSelection}
              className="text-gray-300 hover:text-gray-100 text-sm"
              title="Cancel selection"
            >
              X
            </button>
          ) : (
            <button onClick={() => history.goBack()} title="Back">
              <BiArrowBack size={20} />
            </button>
          )}
          <h1 className="font-semibold text-lg text-white">
            Developer Chat
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {selectionMode && selectedIds.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="text-red-400 hover:text-red-300 text-sm"
              title="Delete selected"
            >
              Delete
            </button>
          )}
          {!selectionMode && (
            <button
              onClick={handleRefresh}
              className={`text-gray-200 ${isRefreshing ? "opacity-60" : ""}`}
              title="Refresh messages"
              disabled={isRefreshing}
            >
              <FaSyncAlt size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3 flex flex-col-reverse gap-3"
        data-testid="admin-messages"
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          const maxScrollTop = Math.max(el.scrollHeight - el.clientHeight, 0);
         //console.log("maxscrolltop",maxScrollTop,"el.scroll",el.scrollTop)
          if (maxScrollTop > 0 && el.scrollTop <= -maxScrollTop +1 ) {
            handleLoadOlder();
          }
        }}
      >
        {[...messages].reverse().map(msg => {
          const id = getMsgId(msg) || msg.id;
          const selected = id && selectedIds.has(id);
          return (
            <div
              key={id}
              data-testid="admin-message"
              onClick={() => selectionMode && toggleSelection(msg)}
              {...makeLongPressHandlers(msg)}
              className={selected ? "ring-2 ring-red-400 rounded-2xl" : ""}
            >
              <div
                className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
                  ${msg.sender === "admin"
                    ? "bg-slate-800 text-gray-200 self-start"
                    : "bg-blue-600 text-white self-end ml-auto"
                  }`}
              >
                <div>{msg.content}</div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    {msg.timestamp
                      ? new Date(msg.timestamp).toLocaleString()
                      : ""}
                  </span>
                  {msg.sender === "admin" && (
                    <span>{msg.read ? "Read" : "Unread"}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {cachedCount > visibleCount && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleLoadOlder}
              className="text-xs text-slate-300 hover:text-white border border-slate-700 px-3 py-1 rounded-full"
            >
              {loadingOlder ? "Loading..." : "Load older"}
            </button>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-700 bg-slate-900 flex gap-2">
        <input
        disabled={false}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 bg-slate-950 border border-slate-600 rounded-xl px-4 py-2 text-sm outline-none text-gray-200 placeholder-gray-400"
        />
        <button
        disabled={false}
          onClick={handleSend}
          className="bg-green-500 hover:bg-green-600 text-white px-4 rounded-xl transition"
        >
          Send
        </button>
      </div>
    </div>
  );
}
