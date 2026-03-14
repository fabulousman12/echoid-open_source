import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import UserInformationStep from "./UserInformationStep";

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return { ...actual, useHistory: () => ({ push: vi.fn() }) };
});

vi.mock("react-easy-crop", () => ({
  default: () => null
}));

vi.mock("@mui/icons-material/FileOpen", () => ({
  default: () => null
}));

test("privacy policy modal opens and accept checks the box", () => {
  render(<UserInformationStep onNext={vi.fn()} />);

  fireEvent.click(screen.getByRole("button", { name: "Privacy Policy" }));
  const policyTitles = screen.getAllByText("Privacy Policy");
  expect(policyTitles.length).toBeGreaterThan(1);

  fireEvent.click(screen.getByText("Accept"));

  const checkbox = document.querySelector('input[type="checkbox"]');
  expect(checkbox).not.toBeNull();
  expect(checkbox.checked).toBe(true);
});
