import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CategoryNode } from "../packages/category-tree/index";
import type {
  WorkspaceGateway,
  WorkspaceImageEntry,
} from "../packages/workspace-gateway/index";
import { App } from "./App";

function createFakeGateway(): {
  gateway: WorkspaceGateway;
  savedJsonPayloads: Array<{ entry: WorkspaceImageEntry; json: string }>;
  savedCategories: CategoryNode[][];
} {
  const entries: WorkspaceImageEntry[] = [
    {
      path: "/lab/umero/umero_anterior.webp",
      fileName: "umero_anterior.webp",
      extension: "webp",
      mimeType: "image/webp",
      jsonPath: "/lab/umero/umero_anterior.json",
      hasJson: false,
      pinCount: 0,
    },
    {
      path: "/lab/umero/umero_posterior.jpg",
      fileName: "umero_posterior.jpg",
      extension: "jpg",
      mimeType: "image/jpeg",
      jsonPath: "/lab/umero/umero_posterior.json",
      hasJson: false,
      pinCount: 0,
    },
  ];

  const savedJsonPayloads: Array<{ entry: WorkspaceImageEntry; json: string }> =
    [];
  const savedCategories: CategoryNode[][] = [];

  const gateway: WorkspaceGateway = {
    runtime: "tauri",
    pickFolder: vi.fn(async () => ({
      folderName: "umero",
      folderPath: "/lab/umero",
      entries,
    })),
    pickSingleImage: vi.fn(async () => entries[0]),
    inspectDroppedPath: vi.fn(async () => entries[0]),
    createEntryFromFile: vi.fn(() => entries[0]),
    loadImageUrl: vi.fn(async (entry) => ({
      url: `blob:${entry.fileName}`,
      revoke: vi.fn(),
    })),
    readSiblingJson: vi.fn(async () => null),
    saveSiblingJson: vi.fn(async (entry, json) => {
      savedJsonPayloads.push({ entry, json });
      return { savedFileName: `${entry.fileName.split(".")[0]}.json` };
    }),
    saveJsonAs: vi.fn(async (suggested) => ({ savedFileName: suggested })),
    importJsonFile: vi.fn(async () => null),
    loadCustomCategories: vi.fn(async () => []),
    saveCustomCategories: vi.fn(async (nodes) => {
      savedCategories.push(nodes);
    }),
  };

  return { gateway, savedJsonPayloads, savedCategories };
}

describe("App end-to-end flows", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.setAttribute("data-theme", "dark");
  });

  it("toggles Dark (Graphite) and Light (Off-White) themes via sliding switch", async () => {
    const user = userEvent.setup();
    const { gateway } = createFakeGateway();
    render(<App gateway={gateway} />);

    const themeSwitch = screen.getByRole("switch", { name: "Tema" });
    expect(themeSwitch).toHaveAttribute("aria-checked", "true");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    await user.click(themeSwitch);
    expect(themeSwitch).toHaveAttribute("aria-checked", "false");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("supports Tree Toolbox Navigator, inline child category, Eye branch visibility, saving JSON v1.0.0, and Visualization HUD", async () => {
    const user = userEvent.setup();
    const { gateway, savedJsonPayloads, savedCategories } = createFakeGateway();
    render(<App gateway={gateway} />);

    // 1. Open folder from minimal EmptyState -> Authoring Toolbox Navigator appears expanded
    await user.click(screen.getByRole("button", { name: "Abrir Pasta" }));
    const img = await screen.findByAltText("umero_anterior.webp");
    const nav = screen.getByTestId("toolbox-navigator");
    expect(nav).toHaveAttribute("data-expanded", "true");

    // Verify 3-bar button inside Navigator top bar retracts into 44px compact icon rail and re-expands cleanly
    const threeBarToggle = within(nav).getByRole("button", {
      name: "Navegador",
    });
    expect(threeBarToggle).toHaveAttribute("aria-expanded", "true");
    await user.click(threeBarToggle);
    expect(nav).toHaveAttribute("data-expanded", "false");
    expect(screen.getByTestId("toolbox-compact-rail")).toBeInTheDocument();

    // Clicking the Tree icon on the compact rail re-expands right back to Árvore
    await user.click(screen.getByRole("button", { name: "Abrir seção Árvore" }));
    expect(nav).toHaveAttribute("data-expanded", "true");

    vi.spyOn(img, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 1000,
      height: 1000,
      right: 1000,
      bottom: 1000,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    // 2. Create custom child category inline under Esquelético in the Tree Navigator
    await user.click(
      screen.getByRole("button", {
        name: "Adicionar subcategoria em Esquelético",
      }),
    );
    await user.type(screen.getByLabelText("Nova categoria"), "Acidentes Ósseos");
    await user.click(screen.getByRole("button", { name: "Criar" }));

    expect(savedCategories.at(-1)?.[0]).toMatchObject({
      label: "Acidentes Ósseos",
      parentId: "sistemas.esqueletico",
    });

    // 3. Click image to place pin at (50%, 25%) and fill fields in focused right card
    fireEvent.click(img, { clientX: 500, clientY: 250 });

    await user.type(screen.getByLabelText("Nome do pin"), "Sulco intertubercular");
    await user.selectOptions(
      screen.getByLabelText("Categoria do pin"),
      "sistemas.esqueletico.acidentes-osseos",
    );
    await user.type(
      screen.getByLabelText("Descrição do pin"),
      "Passagem do tendão da cabeça longa do bíceps.",
    );
    await user.type(
      screen.getByLabelText("Bibliografia do pin"),
      "MOORE, 8ª ed.",
    );

    // 4. Independent Eye visibility toggle on parent Esquelético hides child pin on canvas
    expect(screen.getByTestId("canvas-pin-pin-1")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ocultar Esquelético" }));
    expect(screen.queryByTestId("canvas-pin-pin-1")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Mostrar Esquelético" }));
    expect(screen.getByTestId("canvas-pin-pin-1")).toBeInTheDocument();

    // 5. Save sibling JSON and verify payload
    await user.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(savedJsonPayloads).toHaveLength(1));

    const parsed = JSON.parse(savedJsonPayloads[0].json);
    expect(parsed.schemaVersion).toBe("1.0.0");
    expect(parsed.image.fileName).toBe("umero_anterior.webp");
    expect(parsed.pins[0]).toMatchObject({
      name: "Sulco intertubercular",
      x: 50,
      y: 25,
      categoryId: "sistemas.esqueletico.acidentes-osseos",
      bibliography: "MOORE, 8ª ed.",
    });
    expect(parsed.categories.map((c: CategoryNode) => c.label)).toEqual([
      "Acidentes Ósseos",
    ]);

    // 6. Switch to Visualization Mode -> Authoring Toolbox Navigator unmounts, Detail Card stays focused
    await user.click(screen.getByRole("button", { name: "Visualização" }));
    expect(screen.queryByTestId("toolbox-navigator")).not.toBeInTheDocument();

    const card = screen.getByTestId("visualization-detail-card");
    expect(card).toHaveAttribute("data-expanded", "true");
    expect(card).toHaveTextContent("Sulco intertubercular");
    expect(card).toHaveTextContent("Sistemas › Esquelético › Acidentes Ósseos");
    expect(card).toHaveTextContent("MOORE, 8ª ed.");
    expect(card).toHaveTextContent("umero_posterior.jpg");
    expect(screen.getByTestId("pin-crop-preview")).toBeInTheDocument();

    // Verify right-edge zoom bar shifted left for the open right panel, and retracts cleanly on 3-bar click
    const zoomBar = screen.getByTestId("right-zoom-bar");
    expect(zoomBar).toHaveStyle({ transform: "translate3d(-364px, -50%, 0)" });

    const rightToggle = screen.getByRole("button", { name: "Painel do pin" });
    expect(rightToggle).toHaveAttribute("data-direction", "right");
    expect(rightToggle).toHaveAttribute("aria-expanded", "true");

    await user.click(rightToggle);
    expect(card).toHaveAttribute("data-expanded", "false");
    expect(zoomBar).toHaveStyle({ transform: "translate3d(0px, -50%, 0)" });
    // Pin stays selected and visible on canvas; clicking 3-bar toggle re-expands card
    expect(screen.getByTestId("canvas-pin-pin-1")).toBeInTheDocument();

    await user.click(rightToggle);
    expect(card).toHaveAttribute("data-expanded", "true");
    expect(zoomBar).toHaveStyle({ transform: "translate3d(-364px, -50%, 0)" });

    // 7. Filter by parent category Esquelético in retractable floating legend -> child pin remains visible
    const legend = screen.getByTestId("floating-legend");
    expect(legend).toHaveTextContent("Esquelético");
    await user.click(
      within(legend).getByRole("button", { name: /^Esquelético/i }),
    );
    expect(screen.getByTestId("canvas-pin-pin-1")).toBeInTheDocument();
  });
});
