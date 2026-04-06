import React from "react";
import { render, fireEvent, act } from "@testing-library/react";
import { vi } from "vitest";
import ProfilePage from "./ProfilePage";
import { api } from "../services/api";
import { clearTokens, getRefreshToken } from "../services/authTokens";

const { pushMock } = vi.hoisted(() => ({
  pushMock: vi.fn()
}));

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useHistory: () => ({ push: pushMock }),
    useLocation: () => ({ state: {} })
  };
});

vi.mock("./StarLoader", () => ({
  default: () => <div data-testid="loader">Loading</div>
}));

vi.mock("lucide-react", () => ({
  User: () => <span />,
  Mail: () => <span />,
  Phone: () => <span />,
  Calendar: () => <span />,
  MapPin: () => <span />,
  LogOut: () => <span />,
  Edit2: () => <span />,
  Save: () => <span />,
  X: () => <span />,
  Camera: () => <span />,
  ChevronRight: () => <span />
}));

vi.mock("react-easy-crop", () => ({
  default: () => <div data-testid="cropper" />
}));

vi.mock("@react-google-maps/api", () => ({
  Autocomplete: ({ children }) => <div>{children}</div>
}));

vi.mock("../services/api", () => ({
  api: {
    logout: vi.fn(async () => ({ ok: true, json: async () => ({}) })),
    sessions: vi.fn(async () => ({ ok: true, json: async () => ({ success: true, sessions: [] }) })),
    revokeDevice: vi.fn(async () => ({ ok: true, json: async () => ({ success: true }) }))
  }
}));

vi.mock("../services/authTokens", () => ({
  getRefreshToken: vi.fn(async () => "refresh"),
  clearTokens: vi.fn(async () => {})
}));

vi.mock("../services/deviceInfo", () => ({
  getDeviceId: vi.fn(async () => "device-1"),
  getDeviceIdSync: vi.fn(() => "device-1")
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
    removeItem: vi.fn((key) => map.delete(key))
  };
}

beforeEach(() => {
  pushMock.mockClear();
  globalThis.storage = createStorageMock();
  globalThis.storage.setItem(
    "currentuser",
    JSON.stringify({ name: "Me", About: "hi", profilePhoto: "" })
  );
});

test("logout clears storage, tokens, and routes to login", async () => {
  const { findByText } = render(<ProfilePage host="https://example.com" />);

  const logoutBtn = await findByText("Logout");
  await act(async () => {
    fireEvent.click(logoutBtn);
  });

  expect(getRefreshToken).toHaveBeenCalled();
  expect(api.logout).toHaveBeenCalled();
  expect(clearTokens).toHaveBeenCalled();
  expect(globalThis.storage.removeItem).toHaveBeenCalledWith("currentuser");
  expect(globalThis.storage.removeItem).toHaveBeenCalledWith("privateKey");
  expect(globalThis.storage.removeItem).toHaveBeenCalledWith("device_token");
  expect(pushMock).toHaveBeenCalledWith("/login");
});

test("profile edit fields expose the expected max lengths", async () => {
  const { findByText, container } = render(<ProfilePage host="https://example.com" />);

  const profileDetailBtn = await findByText("Profile detail");
  await act(async () => {
    fireEvent.click(profileDetailBtn);
  });

  const editBtn = await findByText("Edit Profile");
  await act(async () => {
    fireEvent.click(editBtn);
  });

  const textInputs = Array.from(container.querySelectorAll('input[type="text"]'));
  const textareas = Array.from(container.querySelectorAll("textarea"));
  const fullNameInput = textInputs.find((input) => input.value === "Me");
  const locationInput = textInputs.find((input) => input.value === "");
  const aboutInput = textareas[0];

  expect(fullNameInput?.maxLength).toBe(30);
  expect(aboutInput?.maxLength).toBe(120);
  expect(locationInput?.maxLength).toBe(35);
});
