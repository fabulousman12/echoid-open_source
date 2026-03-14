import React from "react";
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import VideoCallScreen from "./VideoCallScreen";

vi.mock("../components/webrtc/callHandler", () => ({
  startCall: vi.fn(),
  answerCall: vi.fn(async () => {}),
  endCall: vi.fn(),
  declineIncomingCall: vi.fn(),
  onCallAnswer: vi.fn(),
  onRemoteIce: vi.fn(),
  toggleCamera: vi.fn(),
  toggleMic: vi.fn(),
  switchCamera: vi.fn(),
  handleIceRestartOffer: vi.fn(),
  handleIceRestartAnswer: vi.fn()
}));

vi.mock("../services/callRingtone", () => ({
  startCallRingtone: vi.fn(),
  stopCallRingtone: vi.fn(),
  startCallTimeout: vi.fn(),
  clearCallTimeout: vi.fn()
}));

vi.mock("../store/useCallStore", () => ({
  useCallStore: () => ({
    setCallActive: vi.fn(),
    setIncomingCall: vi.fn(),
    setCallAccepted: vi.fn()
  })
}));

vi.mock("../store/CallRuntime", () => ({
  CallRuntime: {
    isFloating: false,
    overlayActive: false,
    showScreen: true,
    data: {},
    hide: vi.fn()
  }
}));

vi.mock("lucide-react", () => ({
  Video: () => <span />,
  VideoOff: () => <span />,
  Mic: () => <span />,
  MicOff: () => <span />,
  PhoneOff: () => <span />,
  Phone: () => <span />,
  X: () => <span />,
  Settings: () => <span />
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useHistory: () => ({ push: vi.fn() }),
    useLocation: () => ({ state: {} })
  };
});

test("shows offline status when starting call without socket", () => {
  render(
    <VideoCallScreen
      socket={null}
      mode="call"
      currentUser="me"
      targetUser="them"
      userdetail={{ name: "Them" }}
    />
  );

  expect(screen.getAllByText("User is Offline").length).toBeGreaterThan(0);
});

test("shows incoming call text for answer mode without Answer flag", () => {
  render(
    <VideoCallScreen
      socket={{ send: vi.fn() }}
      mode="answer"
      offer={{ sdp: "x" }}
      Answer={false}
      callerId="them"
      userId="me"
      userdetail={{ name: "Them" }}
    />
  );

  expect(screen.getAllByText("Incoming call...").length).toBeGreaterThan(0);
});
