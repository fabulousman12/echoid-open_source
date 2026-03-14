import React from "react";
import { render, act } from "@testing-library/react";
import { vi } from "vitest";
import Chatwindo from "./chatwindo";

const { pushMock, backButtonHandler } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  backButtonHandler: { current: null }
}));

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useHistory: () => ({ push: pushMock }),
    useLocation: () => ({
      state: {
        userdetails: {
          id: "u2",
          name: "Bob",
          avatar: "",
          publicKey: "-----BEGIN PUBLIC KEY-----\nZg==\n-----END PUBLIC KEY-----"
        }
      }
    })
  };
});

vi.mock("@capacitor/app", () => ({
  App: {
    addListener: vi.fn((event, cb) => {
      if (event === "backButton") backButtonHandler.current = cb;
      return { remove: vi.fn() };
    })
  }
}));

vi.mock("@ionic/react", () => ({
  IonSpinner: () => <span />,
  IonButton: ({ children, ...rest }) => <button {...rest}>{children}</button>,
  IonIcon: () => <span />,
  isPlatform: () => false
}));

vi.mock("@capacitor/filesystem", () => ({
  Filesystem: {
    writeFile: vi.fn(async () => ({ uri: "file://test" }))
  },
  Directory: { External: "External", ExternalStorage: "ExternalStorage" },
  Encoding: { Base64: "Base64" }
}));

vi.mock("@capacitor/toast", () => ({
  Toast: { show: vi.fn(async () => {}) }
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { convertFileSrc: (uri) => uri }
}));

vi.mock("@capawesome-team/capacitor-file-opener", () => ({
  FileOpener: { open: vi.fn(async () => {}) }
}));

vi.mock("plyr-react", () => ({
  default: () => <div data-testid="plyr" />
}));

vi.mock("emoji-picker-react", () => ({
  default: () => <div data-testid="emoji" />
}));

vi.mock("ionic-thumbnail", () => ({
  ffmpeg_thumnail: vi.fn(async () => "")
}));

vi.mock("node-forge", () => ({}));

vi.mock("../components/ImageRenderer", () => ({
  default: () => <div data-testid="image-renderer" />
}));
vi.mock("../components/VideoRenderer", () => ({
  default: () => <div data-testid="video-renderer" />
}));
vi.mock("../components/DocumentRenderer", () => ({
  default: () => <div data-testid="doc-renderer" />
}));
vi.mock("../components/VideoPlayerPlyr", () => ({
  default: () => <div data-testid="video-player" />
}));
vi.mock("../components/VoiceRecordingUI", () => ({
  default: () => <div data-testid="voice-rec" />
}));

vi.mock("../services/api", () => ({
  api: new Proxy(
    {},
    {
      get: () =>
        vi.fn(async () => ({
          ok: true,
          json: async () => ({ success: true })
        }))
    }
  )
}));

vi.mock("../services/authTokens", () => ({
  getAccessToken: vi.fn(async () => "token")
}));

vi.mock("../services/uploadValidation", () => ({
  getUploadUrl: vi.fn(async () => ({ uploadUrl: "https://example.com" })),
  isValidUploadResult: vi.fn(() => true)
}));

vi.mock("../services/wsPayloads", () => ({
  buildUnreadUpdate: vi.fn(() => ({}))
}));

vi.mock("../store/CallRuntime", () => ({
  CallRuntime: {
    isFloating: false,
    overlayActive: false,
    showScreen: false,
    data: {}
  }
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
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key)
  };
}

beforeEach(() => {
  pushMock.mockClear();
  backButtonHandler.current = null;
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
  }
  if (!globalThis.IntersectionObserver) {
    globalThis.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
  globalThis.storage = createStorageMock();
  globalThis.storage.setItem("currentuser", JSON.stringify({ _id: "me" }));
  globalThis.storage.setItem(
    "usersMain",
    JSON.stringify([{ id: "u2", name: "Bob" }])
  );
  globalThis.fetch = vi.fn(async () => ({
    ok: true,
    json: async () => ({ success: true, publicKey: "key" })
  }));
  vi.stubGlobal("crypto", {
    subtle: {
      importKey: vi.fn(async () => ({})),
      encrypt: vi.fn(async () => new TextEncoder().encode("x").buffer),
      decrypt: vi.fn(async () => new TextEncoder().encode("x").buffer),
      generateKey: vi.fn(async () => ({ publicKey: {}, privateKey: {} })),
      exportKey: vi.fn(async () => ({ kty: "RSA", n: "n", e: "e", d: "d" }))
    }
  });
});

test("back button navigates to home", async () => {
  render(
    <Chatwindo
      db={null}
      socket={{ addEventListener: vi.fn(), removeEventListener: vi.fn(), send: vi.fn(), readyState: 1 }}
      setMessages={vi.fn()}
      saveMessage={vi.fn()}
      selectedUser={{ current: null }}
      messagesRef={{ current: [] }}
      blockUser={vi.fn()}
      unblockUser={vi.fn()}
      blockedUsers={new Set()}
      setMessagestest={vi.fn()}
      message=""
      storeMessageInSQLite={vi.fn()}
      setmutedList={vi.fn()}
      setUsersMain={vi.fn()}
      host="https://example.com"
      customSounds={[]}
      setCustomSounds={vi.fn()}
    />
  );

  expect(backButtonHandler.current).toBeTypeOf("function");

  await act(async () => {
    backButtonHandler.current();
  });

  expect(pushMock).toHaveBeenCalledWith("/home");
});
