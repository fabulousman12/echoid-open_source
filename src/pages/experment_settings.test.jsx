import React from "react";
import { render, fireEvent, act } from "@testing-library/react";
import { vi } from "vitest";
import SettingsPage from "./experment_settings";
import { api } from "../services/api";
import { clearTokens, getRefreshToken } from "../services/authTokens";

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

vi.mock("@capacitor/filesystem", () => ({
  Filesystem: { writeFile: vi.fn(async () => ({ uri: "file://test" })) },
  Directory: { Documents: "Documents" }
}));

vi.mock("lucide-react", () => ({
  BellOff: () => <span />,
  Volume2: () => <span />,
  Upload: () => <span />,
  Play: () => <span />,
  Pause: () => <span />,
  X: () => <span />
}));

vi.mock("../services/api", () => ({
  api: {
    logout: vi.fn(async () => ({ ok: true, json: async () => ({}) }))
  }
}));

vi.mock("../services/authTokens", () => ({
  getRefreshToken: vi.fn(async () => "refresh"),
  clearTokens: vi.fn(async () => {})
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
  globalThis.storage = createStorageMock();
  globalThis.storage.setItem("usersMain", JSON.stringify([]));
  globalThis.storage.setItem("mutedUsers", JSON.stringify([]));
});

test("logout clears auth and routes to login", async () => {
  const setCurrentUser = vi.fn();
  const { getByText } = render(
    <SettingsPage
      ForAllSounfds={null}
      setForAllSounds={vi.fn()}
      setismute={vi.fn()}
      isnotmute={true}
      mode="normal"
      setMode={vi.fn()}
      messagesRef={{ current: [] }}
      setCurrentUser={setCurrentUser}
    />
  );

  await act(async () => {
    fireEvent.click(getByText("Logout"));
  });

  expect(getRefreshToken).toHaveBeenCalled();
  expect(api.logout).toHaveBeenCalled();
  expect(clearTokens).toHaveBeenCalled();
  expect(setCurrentUser).toHaveBeenCalledWith(null);
  expect(pushMock).toHaveBeenCalledWith("/login");
});
