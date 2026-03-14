import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react";
import { vi } from "vitest";
import AdminChat from "./AdminChat";

const { goBackMock } = vi.hoisted(() => ({
  goBackMock: vi.fn()
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useHistory: () => ({ goBack: goBackMock })
  };
});

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
  goBackMock.mockClear();
  globalThis.storage = createStorageMock();
});

test("loads admin messages and renders them", async () => {
  const fetchAdminMessages = vi.fn(async () => ({
    messages: [
      { _id: "a1", sender: "admin", content: "Hello", timestamp: 1000, read: false }
    ],
    fetchedCount: 1
  }));
  const sendAdminMessage = vi.fn(async () => true);
  const markAdminMessagesRead = vi.fn((msgs) => msgs.map((m) => ({ ...m, read: true })));

  const { getByText } = render(
    <AdminChat
      fetchAdminMessages={fetchAdminMessages}
      sendAdminMessage={sendAdminMessage}
      markAdminMessagesRead={markAdminMessagesRead}
    />
  );

  await waitFor(() => {
    expect(getByText("Hello")).toBeTruthy();
  });
});

test("sending message stores it with read=true", async () => {
  const fetchAdminMessages = vi.fn(async () => ({
    messages: [],
    fetchedCount: 0
  }));
  const sendAdminMessage = vi.fn(async () => true);

  const { getByPlaceholderText, getByText } = render(
    <AdminChat
      fetchAdminMessages={fetchAdminMessages}
      sendAdminMessage={sendAdminMessage}
      markAdminMessagesRead={null}
    />
  );

  const input = getByPlaceholderText("Type your message...");
  fireEvent.change(input, { target: { value: "Hi admin" } });
  fireEvent.click(getByText("Send"));

  await waitFor(() => {
    const raw = globalThis.storage.getItem("admin_messages_cache");
    expect(raw).toBeTruthy();
    const cached = JSON.parse(raw);
    const saved = cached.find((m) => m.content === "Hi admin");
    expect(saved).toBeTruthy();
    expect(saved.read).toBe(true);
  });
});

test("refresh button triggers fetch and updates messages", async () => {
  const fetchAdminMessages = vi.fn(async () => ({
    messages: [
      { _id: "a1", sender: "admin", content: "First", timestamp: 1000, read: false }
    ],
    fetchedCount: 1
  }));
  const sendAdminMessage = vi.fn(async () => true);

  const { getByText, getByTitle } = render(
    <AdminChat
      fetchAdminMessages={fetchAdminMessages}
      sendAdminMessage={sendAdminMessage}
      markAdminMessagesRead={null}
    />
  );

  await waitFor(() => {
    expect(getByText("First")).toBeTruthy();
  });

  fetchAdminMessages.mockResolvedValueOnce({
    messages: [
      { _id: "a1", sender: "admin", content: "First", timestamp: 1000, read: false },
      { _id: "a2", sender: "admin", content: "Second", timestamp: 2000, read: false }
    ],
    fetchedCount: 1
  });

  fireEvent.click(getByTitle("Refresh messages"));

  await waitFor(() => {
    expect(getByText("Second")).toBeTruthy();
  });
});

test("load older button pulls older messages from storage", async () => {
  const makeMessages = (count) =>
    Array.from({ length: count }).map((_, i) => ({
      _id: `m${i + 1}`,
      sender: "admin",
      content: `Msg ${i + 1}`,
      timestamp: 1000 + i,
      read: false
    }));

  const all = makeMessages(16);
  const fetchAdminMessages = vi.fn(async () => ({
    messages: all,
    fetchedCount: 20
  }));

  const { getByText } = render(
    <AdminChat
      fetchAdminMessages={fetchAdminMessages}
      sendAdminMessage={vi.fn(async () => true)}
      markAdminMessagesRead={null}
    />
  );

  await waitFor(() => {
    expect(getByText("Msg 16")).toBeTruthy();
  });

  fireEvent.click(getByText("Load older"));

  await waitFor(() => {
    expect(getByText("Msg 1")).toBeTruthy();
  });
});

test("loads older messages in batches of 10 up to 250", async () => {
  const makeMessages = (count) =>
    Array.from({ length: count }).map((_, i) => ({
      _id: `m${i + 1}`,
      sender: "admin",
      content: `Msg ${i + 1}`,
      timestamp: 1000 + i,
      read: false
    }));

  const all = makeMessages(250);
  const fetchAdminMessages = vi.fn(async () => ({
    messages: all,
    fetchedCount: 20
  }));

  const { getByTestId, getAllByTestId } = render(
    <AdminChat
      fetchAdminMessages={fetchAdminMessages}
      sendAdminMessage={vi.fn(async () => true)}
      markAdminMessagesRead={null}
    />
  );

  await waitFor(() => {
    expect(getAllByTestId("admin-message").length).toBe(15);
  });

  for (let i = 0; i < 24; i += 1) {
    fireEvent.click(getByTestId("admin-messages").querySelector("button"));
    await waitFor(() => {
      const expected = Math.min(15 + (i + 1) * 10, 250);
      expect(getAllByTestId("admin-message").length).toBe(expected);
    });
  }
});

test("long press selects and delete removes from storage", async () => {
  globalThis.storage.setItem(
    "admin_messages_cache",
    JSON.stringify([
      { _id: "a1", sender: "admin", content: "One", timestamp: 1000, read: false },
      { _id: "a2", sender: "admin", content: "Two", timestamp: 2000, read: false }
    ])
  );

  const fetchAdminMessages = vi.fn(async () => ({
    messages: [
      { _id: "a1", sender: "admin", content: "One", timestamp: 1000, read: false },
      { _id: "a2", sender: "admin", content: "Two", timestamp: 2000, read: false }
    ],
    fetchedCount: 20
  }));

  const { getByText, getAllByTestId } = render(
    <AdminChat
      fetchAdminMessages={fetchAdminMessages}
      sendAdminMessage={vi.fn(async () => true)}
      markAdminMessagesRead={null}
    />
  );

  await waitFor(() => {
    expect(getByText("One")).toBeTruthy();
  });

  vi.useFakeTimers();
  const item = getByText("One").closest('[data-testid="admin-message"]');
  fireEvent.mouseDown(item);
  await act(async () => {
    vi.advanceTimersByTime(500);
  });
  fireEvent.mouseUp(item);

  vi.useRealTimers();
  await waitFor(() => {
    expect(getByText("Delete")).toBeTruthy();
  });

  await act(async () => {
    fireEvent.click(getByText("Delete"));
  });

  await waitFor(() => {
    const raw = globalThis.storage.getItem("admin_messages_cache");
    const cached = raw ? JSON.parse(raw) : [];
    expect(cached.find((m) => m._id === "a1")).toBeFalsy();
  });
});

test("selection mode hides back and refresh buttons", async () => {
  globalThis.storage.setItem(
    "admin_messages_cache",
    JSON.stringify([
      { _id: "a1", sender: "admin", content: "One", timestamp: 1000, read: false }
    ])
  );

  const fetchAdminMessages = vi.fn(async () => ({
    messages: [
      { _id: "a1", sender: "admin", content: "One", timestamp: 1000, read: false }
    ],
    fetchedCount: 20
  }));

  const { getAllByTestId, getByText, queryByTitle } = render(
    <AdminChat
      fetchAdminMessages={fetchAdminMessages}
      sendAdminMessage={vi.fn(async () => true)}
      markAdminMessagesRead={null}
    />
  );

  await waitFor(() => {
    expect(getByText("One")).toBeTruthy();
  });

  vi.useFakeTimers();
  const items = getAllByTestId("admin-message");
  fireEvent.mouseDown(items[0]);
  await act(async () => {
    vi.advanceTimersByTime(500);
  });
  fireEvent.mouseUp(items[0]);
  vi.useRealTimers();

  await waitFor(() => {
    expect(getByText("X")).toBeTruthy();
  });

  expect(queryByTitle("Back")).toBeNull();
  expect(queryByTitle("Refresh messages")).toBeNull();
});
