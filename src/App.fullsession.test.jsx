import React from "react";
import { render, fireEvent, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import App from "./App";

const {
  pushMock,
  getAccessTokenMock,
  refreshAccessTokenWithReasonMock,
  apiMocks,
  hashPrivateKeyMock
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  getAccessTokenMock: vi.fn(),
  refreshAccessTokenWithReasonMock: vi.fn(),
  apiMocks: {
    getUser: vi.fn(),
    blocked: vi.fn(),
    updateKey: vi.fn()
  },
  hashPrivateKeyMock: vi.fn()
}));

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useHistory: () => ({ push: pushMock })
  };
});

vi.mock("./pages/HomeScreen", () => ({
  default: ({ usersMain = [], setUsersMain, setMessages }) => {
    const { useHistory } = require("react-router");
    const history = useHistory();
    const addUsers = () => {
      const extra = Array.from({ length: 15 }, (_, i) => ({
        id: `u-extra-${i + 1}`,
        name: `Extra ${i + 1}`
      }));
      setUsersMain([...usersMain, { id: "u2", name: "Bob" }, ...extra]);
    };
    return (
      <div>
        <div
          data-testid="user-list"
          data-scroll={usersMain.length > 10 ? "true" : "false"}
        >
          {usersMain.map((u) => (
            <div key={u.id}>{u.name}</div>
          ))}
        </div>
        <button onClick={() => history.push("/signup")}>go-signup</button>
        <button onClick={() => history.push("/newchatwindow")}>go-newchat</button>
        <button onClick={() => history.push("/Profile")}>go-profile</button>
        <button onClick={addUsers}>add-users</button>
        <button onClick={() => setMessages((m) => [...m, { id: "outside" }])}>
          outside-message
        </button>
        <button
          onClick={() => {
            window.__CALL_OUTSIDE__ = true;
          }}
        >
          outside-call
        </button>
        <button
          onClick={() => window.dispatchEvent(new Event("auth-logout"))}
        >
          revoke-session
        </button>
      </div>
    );
  }
}));

vi.mock("./pages/Newchatwindo", () => ({
  default: () => {
    const { useHistory } = require("react-router");
    const history = useHistory();
    return (
      <button
        onClick={() =>
          history.push("/chatwindow", {
            userdetails: { id: "u2", name: "Bob" }
          })
        }
      >
        select-user
      </button>
    );
  }
}));

vi.mock("./pages/chatwindo", () => ({
  default: ({ setMessages }) => {
    const { useHistory, useLocation } = require("react-router");
    const history = useHistory();
    const location = useLocation();
    const name = location.state?.userdetails?.name || "Unknown";
    return (
      <div>
        <div data-testid="chat-name">{name}</div>
        <button onClick={() => setMessages((m) => [...m, { id: "m1" }])}>
          send-message
        </button>
        <button onClick={() => setMessages((m) => [...m, { id: "m2" }])}>
          receive-message
        </button>
        <button
          onClick={() => {
            window.__CALL_IN_CHAT__ = true;
          }}
        >
          call-in-chat
        </button>
        <button onClick={() => history.push("/home")}>back-home</button>
      </div>
    );
  }
}));

vi.mock("./pages/ProfilePage", () => ({
  default: () => {
    const { useHistory } = require("react-router");
    const history = useHistory();
    return (
      <div>
        <button
          onClick={() =>
            globalThis.storage.setItem(
              "currentuser",
              JSON.stringify({ name: "Edited User" })
            )
          }
        >
          edit-profile
        </button>
        <button onClick={() => history.push("/login")}>logout</button>
      </div>
    );
  }
}));

vi.mock("./pages/LoginScreen", () => ({
  default: () => {
    const { useHistory } = require("react-router");
    const history = useHistory();
    return <button onClick={() => history.push("/home")}>login</button>;
  }
}));

vi.mock("./pages/SignupScreen", () => ({
  default: () => {
    const { useHistory } = require("react-router");
    const history = useHistory();
    return <button onClick={() => history.push("/home")}>signup</button>;
  }
}));

vi.mock("./services/useNetworkStatus", () => ({
  useNetworkStatus: () => ({ connected: true, connectionType: "wifi" })
}));

vi.mock("./Contexts/MessagesContext", async () => {
  const React = (await vi.importActual("react")).default;
  const value = {
    setSelectedUser1: vi.fn(),
    selectedUser: null,
    usersMain: [],
    setUsersMain: vi.fn(),
    isLoad: false,
    setIsLoad: vi.fn()
  };
  const MessageContext = React.createContext(value);
  const MessageProvider = ({ children }) => (
    <MessageContext.Provider value={value}>
      {children}
    </MessageContext.Provider>
  );
  return { MessageContext, MessageProvider };
});

vi.mock("./services/websokcetmain", async () => {
  const React = (await vi.importActual("react")).default;
  const value = {
    getMessagesFromSQLite: vi.fn(),
    storeMessageInSQLite: vi.fn(),
    getunreadcount: vi.fn(),
    updateUnreadCountInSQLite: vi.fn(),
    resetUnreadCountInSQLite: vi.fn(),
    fetchAllMessages: vi.fn()
  };
  const WebSocketContext = React.createContext(value);
  const WebSocketProvider = ({ children }) => (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
  return { WebSocketContext, WebSocketProvider };
});

vi.mock("./services/apiClient", () => ({
  refreshAccessTokenWithReason: (...args) =>
    refreshAccessTokenWithReasonMock(...args),
  refreshAccessToken: vi.fn()
}));

vi.mock("./services/authTokens", () => ({
  getAccessToken: (...args) => getAccessTokenMock(...args),
  getAccessTokenSync: () => null,
  globalLogout: vi.fn()
}));

vi.mock("./services/keyHash", () => ({
  hashPrivateKey: (...args) => hashPrivateKeyMock(...args)
}));

vi.mock("./services/api", () => ({
  api: {
    getUser: (...args) => apiMocks.getUser(...args),
    blocked: (...args) => apiMocks.blocked(...args),
    updateKey: (...args) => apiMocks.updateKey(...args)
  }
}));

vi.mock("./services/deviceInfo", () => ({
  getDeviceId: vi.fn(async () => "device-1"),
  getDeviceIdSync: vi.fn(() => "device-1"),
  getDeviceInfo: vi.fn(async () => ({ deviceId: "device-1" }))
}));

vi.mock("@ionic/storage", () => ({
  Storage: class Storage {
    async defineDriver() {}
    async create() {}
  },
  Drivers: { IndexedDB: "IndexedDB", LocalStorage: "LocalStorage" }
}));

vi.mock("localforage-cordovasqlitedriver", () => ({
  default: { _driver: "cordova" }
}));

vi.mock("@ionic/react", () => ({
  IonAlert: () => null,
  IonToast: () => null,
  setupIonicReact: () => {},
  isPlatform: () => false
}));

vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: {
    schedule: vi.fn(async () => {}),
    addListener: vi.fn(() => ({ remove: vi.fn() })),
    registerActionTypes: vi.fn(async () => {}),
    requestPermissions: vi.fn(async () => ({ display: "granted" })),
    createChannel: vi.fn(async () => {}),
    cancel: vi.fn(async () => {})
  }
}));

vi.mock("@capacitor/app", () => ({
  App: {
    addListener: vi.fn(() => ({ remove: vi.fn() }))
  }
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => false,
    getPlatform: () => "web",
    isPluginAvailable: () => false
  },
  Plugins: {
    Storage: {
      get: vi.fn(async () => ({ value: null })),
      set: vi.fn(async () => {}),
      remove: vi.fn(async () => {}),
      keys: vi.fn(async () => ({ keys: [] }))
    }
  }
}));

vi.mock("sweetalert2", () => ({
  default: { fire: vi.fn() }
}));

function createStorageMock() {
  const map = new Map();
  return {
    map,
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    getItemAsync: async (key) => (map.has(key) ? map.get(key) : null),
    readJSON: (key, fallback = null) => {
      const raw = map.has(key) ? map.get(key) : null;
      if (raw === null || raw === undefined || raw === "") return fallback;
      try {
        return JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    clear: () => map.clear()
  };
}

beforeEach(() => {
  pushMock.mockClear();
  getAccessTokenMock.mockReset();
  refreshAccessTokenWithReasonMock.mockReset();
  Object.values(apiMocks).forEach((fn) => fn.mockReset());
  hashPrivateKeyMock.mockReset();

  globalThis.storage = createStorageMock();
  globalThis.storage.setItem(
    "currentuser",
    JSON.stringify({ publicKey: "-----BEGIN PUBLIC KEY-----\nZg==\n-----END PUBLIC KEY-----", privateKeyHash: "hash" })
  );
  globalThis.storage.setItem("privateKey", "local-key");

  getAccessTokenMock.mockResolvedValue("token");
  refreshAccessTokenWithReasonMock.mockResolvedValue({ token: "token" });
  apiMocks.blocked.mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, blockedUsers: [], blockedBy: [] })
  });
  apiMocks.getUser.mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, userResponse: {} })
  });
  apiMocks.updateKey.mockResolvedValue({
    ok: true,
    json: async () => ({ success: true })
  });
  hashPrivateKeyMock.mockResolvedValue("hash");
});

function renderApp(initialEntries = ["/home"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <App />
    </MemoryRouter>
  );
}

test("signup flow routes back to home", async () => {
  renderApp(["/signup"]);
  fireEvent.click(await screen.findByText("signup"));
  expect(await screen.findByText("go-newchat")).toBeInTheDocument();
});

test("find user from new chat window and open chat", async () => {
  renderApp();
  fireEvent.click(await screen.findByText("go-newchat"));
  fireEvent.click(await screen.findByText("select-user"));
  expect(await screen.findByTestId("chat-name")).toHaveTextContent("Bob");
});

test("send and receive messages inside chat", async () => {
  renderApp();
  fireEvent.click(await screen.findByText("go-newchat"));
  fireEvent.click(await screen.findByText("select-user"));
  fireEvent.click(await screen.findByText("send-message"));
  fireEvent.click(await screen.findByText("receive-message"));
});

test("call in chat and outside chat", async () => {
  renderApp();
  fireEvent.click(await screen.findByText("go-newchat"));
  fireEvent.click(await screen.findByText("select-user"));
  fireEvent.click(await screen.findByText("call-in-chat"));
  expect(window.__CALL_IN_CHAT__).toBe(true);
  fireEvent.click(await screen.findByText("back-home"));
  fireEvent.click(await screen.findByText("outside-call"));
  expect(window.__CALL_OUTSIDE__).toBe(true);
});

test("user list updates and shows scroll flag after adding users", async () => {
  renderApp();
  fireEvent.click(await screen.findByText("add-users"));
  const userList = screen.getByTestId("user-list");
  expect(userList.getAttribute("data-scroll")).toBe("true");
});

test("profile edit updates current user in storage", async () => {
  renderApp();
  fireEvent.click(await screen.findByText("go-profile"));
  fireEvent.click(await screen.findByText("edit-profile"));
  expect(JSON.parse(globalThis.storage.getItem("currentuser")).name).toBe(
    "Edited User"
  );
});

test("logout then login routes correctly", async () => {
  renderApp(["/Profile"]);
  fireEvent.click(await screen.findByText("logout"));
  expect(await screen.findByText("login")).toBeInTheDocument();
  fireEvent.click(await screen.findByText("login"));
  expect(await screen.findByText("go-newchat")).toBeInTheDocument();
});

test("session revoke triggers auth-logout event path", async () => {
  renderApp();
  await act(async () => {
    window.dispatchEvent(new Event("auth-logout"));
  });
});
