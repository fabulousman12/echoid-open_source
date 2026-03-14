import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { vi } from "vitest";
import SignupForm from "./SignupScreen";
import { LoginContext } from "../Contexts/UserContext";
import data from "../data";

const signupMock = vi.fn();
const getuserMock = vi.fn();
const connectMock = vi.fn();
const sendPublicKeyMock = vi.fn();

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return { ...actual, useHistory: () => ({ push: vi.fn() }) };
});

vi.mock("../components/UserInformationStep", () => ({
  default: ({ onNext }) => (
    <button
      onClick={() =>
        onNext({
          name: "Test User",
          email: "test@example.com",
          phone: "9999999999",
          password: "password123",
          profileImage: "data:image/png;base64,abc",
          acceptedTerms: true
        })
      }
    >
      next
    </button>
  )
}));

vi.mock("../components/OTPVerificationStep", () => ({
  default: ({ userInfo, onVerifyOTP }) => (
    <button onClick={() => onVerifyOTP("123456", userInfo)}>verify</button>
  )
}));

vi.mock("../services/authTokens", () => ({
  setTokens: vi.fn(async () => {})
}));

vi.mock("../services/deviceInfo", () => ({
  getDeviceInfo: vi.fn(async () => ({ deviceId: "device-1" }))
}));

function createStorageMock() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    readJSON: (key, fallback = null) => {
      const raw = map.has(key) ? map.get(key) : null;
      if (!raw) return fallback;
      try {
        return JSON.parse(raw);
      } catch {
        return fallback;
      }
    }
  };
}

function renderSignup() {
  globalThis.storage = createStorageMock();
  global.fetch = vi.fn(async () => ({
    json: async () => ({ success: true })
  }));
  return render(
    <LoginContext.Provider
      value={{
        signup: signupMock,
        host: "https://example.com",
        getuser: getuserMock
      }}
    >
      <SignupForm sendPublicKeyToBackend={sendPublicKeyMock} connect={connectMock} />
    </LoginContext.Provider>
  );
}

test("signup sends accepted terms fields", async () => {
  signupMock.mockResolvedValue({
    success: true,
    data: "token",
    refreshToken: "refresh"
  });

  renderSignup();

  fireEvent.click(screen.getByText("next"));

  const verifyBtn = await screen.findByText("verify");
  vi.useFakeTimers();
  await act(async () => {
    fireEvent.click(verifyBtn);
    vi.runAllTimers();
  });
  vi.useRealTimers();

  expect(signupMock).toHaveBeenCalledTimes(1);
  const payload = signupMock.mock.calls[0][0];

  expect(payload.accepted_terms).toBe(true);
  expect(payload.accepted_terms_version).toBe(data.TermsVersion);
  expect(typeof payload.accepted_terms_at).toBe("string");
  expect(payload.accepted_terms_at.length).toBeGreaterThan(0);
  vi.useRealTimers();
});
