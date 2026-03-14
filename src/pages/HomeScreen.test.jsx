import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import HomeScreen from "./HomeScreen";
import { MessageProvider } from "../Contexts/MessagesContext";
import { LoginContext } from "../Contexts/UserContext";

const { pushMock } = vi.hoisted(() => ({
  pushMock: vi.fn()
}));

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useHistory: () => ({ push: pushMock })
  };
});

vi.mock("../components/UserMain", () => ({
  default: ({ onUserClick }) => (
    <button type="button" onClick={() => onUserClick({ id: "u2", name: "Bob" })}>
      open-chat
    </button>
  )
}));

vi.mock("../components/Footer", () => ({
  default: () => <div data-testid="footer">Footer</div>
}));
vi.mock("../components/Group", () => ({
  default: () => <div data-testid="group">Group</div>
}));
vi.mock("../components/Chats", () => ({
  default: () => <div data-testid="chats">Chats</div>
}));
vi.mock("../components/Status", () => ({
  default: () => <div data-testid="status">Status</div>
}));
vi.mock("../components/UpdateModal", () => ({
  default: () => <div data-testid="update-modal">Update</div>
}));

vi.mock("../services/useNetworkStatus", () => ({
  useNetworkStatus: () => ({ connected: true, connectionType: "wifi" })
}));

vi.mock("../services/api", () => ({
  api: {
    logout: vi.fn(async () => ({ ok: true, json: async () => ({}) }))
  }
}));

vi.mock("@ionic/react", () => ({
  IonContent: ({ children }) => <div>{children}</div>,
  IonLoading: () => null,
  IonAlert: () => null,
  IonIcon: () => <span />,
  createGesture: () => ({ enable: () => {} }),
  isPlatform: () => false
}));

vi.mock("@capacitor/push-notifications", () => ({
  PushNotifications: {}
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

vi.mock("@capacitor/toast", () => ({
  Toast: { show: vi.fn(async () => {}) }
}));

vi.mock("../services/authTokens", () => ({
  getAccessToken: vi.fn(async () => "token"),
  getRefreshToken: vi.fn(async () => "refresh"),
  clearTokens: vi.fn(async () => {})
}));

vi.mock("../services/deviceInfo", () => ({
  getDeviceId: vi.fn(async () => "device-1"),
  getDeviceIdSync: vi.fn(() => "device-1")
}));

vi.mock("../services/keyHash", () => ({
  hashPrivateKey: vi.fn(async () => "hash")
}));

function createStorageMock() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    getItemAsync: async (key) => (map.has(key) ? map.get(key) : null),
    readJSON: (key, fallback = null) => {
      const raw = map.has(key) ? map.get(key) : null;
      if (!raw) return fallback;
      try {
        return JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    setItem: (key, value) => map.set(key, String(value))
  };
}

beforeEach(() => {
  pushMock.mockClear();
  globalThis.storage = createStorageMock();
  globalThis.storage.setItem("currentuser", JSON.stringify({ _id: "me" }));
  globalThis.fetch = vi.fn(async () => ({
    ok: true,
    json: async () => ({ success: false })
  }));
});

test("clicking a user navigates to chat window with state", () => {
  const props = {
    usersMaintest: [],
    setUsersMaintest: vi.fn(),
    saveUsersToLocalStorage: vi.fn(),
    socket: null,
    messages: [],
    setMessages: vi.fn(),
    connect: vi.fn(),
    setCurrenuser: vi.fn(),
    getmessages: vi.fn(),
    setUnreadCounts: vi.fn(),
    selectedUser1: { current: null },
    messagesRef: { current: [] },
    isIntialized: true,
    setIsIntialized: vi.fn(),
    saveMessagesToLocalStorage: vi.fn(),
    usersMain: [],
    setUsersMain: vi.fn(),
    db: null,
    mode: "normal",
    setMode: vi.fn(),
    userDetails: {}
  };

  const loginValue = { host: "https://example.com", getuser: vi.fn() };

  const { getByText } = render(
    <LoginContext.Provider value={loginValue}>
      <MessageProvider>
        <HomeScreen {...props} />
      </MessageProvider>
    </LoginContext.Provider>
  );

  fireEvent.click(getByText("open-chat"));

  expect(pushMock).toHaveBeenCalledWith(
    "/chatwindow",
    expect.objectContaining({
      userdetails: expect.objectContaining({ id: "u2" }),
      callback: "goBackToUserList"
    })
  );
});
