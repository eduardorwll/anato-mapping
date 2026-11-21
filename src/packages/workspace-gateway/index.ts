import { createBrowserWorkspaceGateway } from "./lib/browser-adapter";
import { createTauriWorkspaceGateway } from "./lib/tauri-adapter";
import type { WorkspaceGateway } from "./lib/types";

export type {
  FolderSelection,
  LoadedImageResource,
  WorkspaceGateway,
  WorkspaceImageEntry,
} from "./lib/types";

export function isTauriRuntime(): boolean {
  return (
    typeof window !== "undefined" &&
    ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
  );
}

export function createWorkspaceGateway(): WorkspaceGateway {
  return isTauriRuntime()
    ? createTauriWorkspaceGateway()
    : createBrowserWorkspaceGateway();
}
