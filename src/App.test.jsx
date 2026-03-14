import { render } from '@testing-library/react';
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { WebSocketProvider } from "./services/websokcetmain";
import { MessageProvider } from "./Contexts/MessagesContext";
import { LoginProvider } from "./Contexts/UserContext";
import App from './App';

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

vi.mock("@capawesome/capacitor-live-update", () => ({
  LiveUpdate: {
    addListener: vi.fn(() => ({ remove: vi.fn() }))
  }
}));

vi.mock("sweetalert2", () => ({
  default: { fire: vi.fn() }
}));

test('renders without crashing', () => {
  const { baseElement } = render(
    <MemoryRouter>
      <MessageProvider>
        <WebSocketProvider>
          <LoginProvider>
            <App />
          </LoginProvider>
        </WebSocketProvider>
      </MessageProvider>
    </MemoryRouter>
  );
  expect(baseElement).toBeDefined();
});
