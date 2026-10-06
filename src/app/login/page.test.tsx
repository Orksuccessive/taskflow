import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "./page";
import { signIn } from "next-auth/react";

vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("Login page", () => {
  it("renders accessible form fields and submits credentials", async () => {
    const user = userEvent.setup();
    vi.mocked(signIn).mockResolvedValue({
      ok: true,
      error: undefined,
      url: null,
      status: 200,
      code: undefined,
    });

    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole("button", { name: /log in/i });

    expect(emailInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
    await user.type(emailInput, "user@example.com");
    await user.type(passwordInput, "secret123");
    await user.click(submitButton);

    expect(signIn).toHaveBeenCalledWith(
      "credentials",
      expect.objectContaining({
        email: "user@example.com",
        password: "secret123",
        redirect: false,
      })
    );
  });
});
