import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UpdateStatus } from "../electron.d.ts";
import UpdateNotifier from "./UpdateNotifier";

// Captures the callback the component subscribes with, so tests can push
// statuses the way the main process would. Wrapped in act() because it drives
// a state update from outside React.
let notify: (status: UpdateStatus) => void;
const emit = (status: UpdateStatus) => act(() => notify(status));
let unsubscribe: ReturnType<typeof vi.fn>;
let openReleasePage: ReturnType<typeof vi.fn>;

beforeEach(() => {
  unsubscribe = vi.fn();
  openReleasePage = vi.fn().mockResolvedValue(undefined);

  window.electronAPI = {
    onUpdateStatus: (callback: (status: UpdateStatus) => void) => {
      notify = callback;
      return unsubscribe;
    },
    openReleasePage,
  } as unknown as typeof window.electronAPI;
});

describe("UpdateNotifier", () => {
  it("renders nothing until a status arrives", () => {
    const { container } = render(<UpdateNotifier />);
    expect(container).toBeEmptyDOMElement();
  });

  it("announces an available version", async () => {
    render(<UpdateNotifier />);
    emit({ state: "available", version: "1.4.0" });

    expect(await screen.findByText(/version 1\.4\.0 is available/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download/i })).toBeInTheDocument();
  });

  it("opens the release page when Download is clicked", async () => {
    render(<UpdateNotifier />);
    emit({ state: "available", version: "1.4.0" });

    await userEvent.click(await screen.findByRole("button", { name: /download/i }));

    expect(openReleasePage).toHaveBeenCalledOnce();
  });

  it("surfaces a failed check instead of hiding", async () => {
    // An earlier version returned null on error, so a failure looked like the
    // toast spontaneously vanishing.
    render(<UpdateNotifier />);
    emit({ state: "error", message: "network unreachable" });

    expect(await screen.findByText(/couldn't check for updates/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /download/i })).not.toBeInTheDocument();
  });

  it("can be dismissed", async () => {
    render(<UpdateNotifier />);
    emit({ state: "available", version: "1.4.0" });

    await userEvent.click(await screen.findByRole("button", { name: /dismiss/i }));

    expect(screen.queryByText(/is available/i)).not.toBeInTheDocument();
  });

  it("reappears when a new status arrives after being dismissed", async () => {
    render(<UpdateNotifier />);
    emit({ state: "available", version: "1.4.0" });
    await userEvent.click(await screen.findByRole("button", { name: /dismiss/i }));

    emit({ state: "available", version: "1.5.0" });

    expect(await screen.findByText(/version 1\.5\.0 is available/i)).toBeInTheDocument();
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = render(<UpdateNotifier />);
    unmount();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
