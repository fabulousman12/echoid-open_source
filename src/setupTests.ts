import "./setupTests.js";
import { vi } from "vitest";

vi.mock("lottie-react", () => ({
  default: () => null,
}));
