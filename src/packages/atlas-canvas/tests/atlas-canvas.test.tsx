import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createPin } from "../../annotation-schema/index";
import { createDefaultCategoryTree } from "../../category-tree/index";
import { AtlasCanvas } from "../index";

describe("atlas-canvas", () => {
  it("emits exact percentage coordinates when clicking the image in authoring mode", () => {
    const onCreatePin = vi.fn();
    const categories = createDefaultCategoryTree();

    render(
      <AtlasCanvas
        imageUrl="blob:specimen"
        imageAlt="umero.png"
        pins={[]}
        visiblePinIds={new Set()}
        categories={categories}
        mode="author"
        selectedPinId={null}
        activeCategoryFilterId={null}
        focusRequest={null}
        onSelectPin={vi.fn()}
        onCreatePin={onCreatePin}
      />,
    );

    const img = screen.getByAltText("umero.png");
    vi.spyOn(img, "getBoundingClientRect").mockReturnValue({
      left: 100,
      top: 50,
      width: 1000,
      height: 500,
      right: 1100,
      bottom: 550,
      x: 100,
      y: 50,
      toJSON: () => ({}),
    });

    fireEvent.click(img, { clientX: 600, clientY: 175 });
    expect(onCreatePin).toHaveBeenCalledWith({ x: 50, y: 25 });
  });

  it("commits dragged pin coordinates once on pointerup without mid-drag state spam", () => {
    const onMovePin = vi.fn();
    const categories = createDefaultCategoryTree();
    const pin = createPin({
      x: 20,
      y: 20,
      name: "Tubérculo maior",
      categoryId: "sistemas.esqueletico",
    });

    render(
      <AtlasCanvas
        imageUrl="blob:specimen"
        imageAlt="umero.png"
        pins={[pin]}
        visiblePinIds={new Set([pin.id])}
        categories={categories}
        mode="author"
        selectedPinId={pin.id}
        activeCategoryFilterId={null}
        focusRequest={null}
        onSelectPin={vi.fn()}
        onMovePin={onMovePin}
      />,
    );

    const canvas = screen.getByTestId("atlas-canvas");
    const img = screen.getByAltText("umero.png");
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 1000,
      height: 500,
      right: 1000,
      bottom: 500,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    vi.spyOn(img, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 1000,
      height: 500,
      right: 1000,
      bottom: 500,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    const pinButton = screen.getByTestId(`canvas-pin-${pin.id}`);
    fireEvent.pointerDown(pinButton, { button: 0, clientX: 200, clientY: 100 });
    fireEvent.pointerMove(canvas, { clientX: 400, clientY: 200 });
    fireEvent.pointerMove(canvas, { clientX: 750, clientY: 250 });

    // Zero React commits during drag!
    expect(onMovePin).not.toHaveBeenCalled();

    fireEvent.pointerUp(canvas, { clientX: 750, clientY: 250 });
    expect(onMovePin).toHaveBeenCalledTimes(1);
    expect(onMovePin).toHaveBeenCalledWith(pin.id, { x: 75, y: 50 });
  });

  it("renders retractable floating legend and supports category filtering + Camadas toggle", async () => {
    const user = userEvent.setup();
    const onToggleCategoryFilter = vi.fn();
    const categories = createDefaultCategoryTree();
    const pin = createPin({
      x: 42.5,
      y: 33.1,
      name: "Sulco intertubercular",
      categoryId: "sistemas.esqueletico",
    });

    render(
      <AtlasCanvas
        imageUrl="blob:specimen"
        imageAlt="umero.png"
        pins={[pin]}
        visiblePinIds={new Set([pin.id])}
        categories={categories}
        mode="visualize"
        selectedPinId={null}
        activeCategoryFilterId={null}
        focusRequest={null}
        onSelectPin={vi.fn()}
        onToggleCategoryFilter={onToggleCategoryFilter}
      />,
    );

    const legend = screen.getByTestId("floating-legend");
    expect(legend).toHaveTextContent("Esquelético");

    // Collapse Sistemas root in legend -> Esquelético hides
    await user.click(screen.getByRole("button", { name: "Recolher Sistemas" }));
    expect(legend).not.toHaveTextContent("Esquelético");

    // Expand Sistemas root again -> Esquelético returns
    await user.click(screen.getByRole("button", { name: "Expandir Sistemas" }));
    expect(legend).toHaveTextContent("Esquelético");

    await user.click(screen.getByRole("button", { name: /Esquelético/i }));
    expect(onToggleCategoryFilter).toHaveBeenCalledWith("sistemas.esqueletico");

    await user.click(screen.getByRole("button", { name: "Camadas" }));
    expect(screen.getByLabelText("Rótulos")).toBeInTheDocument();
  });
});
