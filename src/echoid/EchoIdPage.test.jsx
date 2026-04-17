import React from "react";
import { fireEvent, render } from "@testing-library/react";
import { vi } from "vitest";
import EchoIdPage from "./EchoIdPage";

vi.mock("lucide-react", () => {
  const Icon = () => <span data-testid="icon" />;
  return {
    Bell: Icon,
    ChevronRight: Icon,
    CircleUserRound: Icon,
    Compass: Icon,
    Filter: Icon,
    Home: Icon,
    Image: Icon,
    Menu: Icon,
    MessageSquarePlus: Icon,
    Search: Icon,
    Sparkles: Icon,
    TriangleAlert: Icon,
  };
});

test("switches tabs and filters search results", () => {
  const { getByText, getByLabelText, queryByText } = render(<EchoIdPage />);

  expect(getByText("Signals moving through the city right now.")).toBeTruthy();
  expect(getByText("5 min ago")).toBeTruthy();

  fireEvent.click(getByText("Search"));
  const searchInput = getByLabelText("Search EchoId");
  fireEvent.change(searchInput, { target: { value: "cipher" } });

  expect(getByText("cipher_coda")).toBeTruthy();
  expect(queryByText("visual_noise")).toBeNull();

  fireEvent.click(getByText("Echo"));
  expect(getByText("Broadcast a new post to your field.")).toBeTruthy();
  expect(getByText("Publish Echo")).toBeTruthy();
});
