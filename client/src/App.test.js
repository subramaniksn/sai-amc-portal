import { render, screen } from "@testing-library/react";
import App from "./App";

jest.mock("./api", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn()
  }
}));

beforeEach(() => {
  localStorage.clear();
});

test("shows the login form when there is no active session", () => {
  render(<App />);

  expect(screen.getByRole("heading", { name: /sai automation amc portal/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
});
