import { render, screen } from "@testing-library/react";
import Home from "./page";

vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));

describe("Home page", () => {
  it("renders the marketing hero and primary actions", async () => {
    const page = await Home();

    render(page);

    expect(
      screen.getByRole("heading", {
        name: /turn work into momentum/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: /start free/i })
    ).toHaveAttribute("href", "/signup");

    expect(
      screen.getByRole("link", { name: /log in/i })
    ).toHaveAttribute("href", "/login");
  });
});
