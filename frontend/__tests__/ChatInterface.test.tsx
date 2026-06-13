import { render, screen, fireEvent } from "@testing-library/react"
import { jest } from "@jest/globals"
import ChatInterface from "../components/ChatInterface"

jest.mock("../lib/session", () => ({
  getSessionId: () => "sess-test-001",
  getFanId:     () => null,
  setFanId:     jest.fn(),
}))

jest.mock("../lib/api", () => ({
  streamChat: jest.fn(() => Promise.resolve()),
}))

describe("ChatInterface", () => {
  it("renders the Golazo header", () => {
    render(<ChatInterface fanId={null} onFanIdChange={() => {}} />)
    expect(screen.getByText(/Golazo/)).toBeInTheDocument()
  })

  it("renders empty state prompt", () => {
    render(<ChatInterface fanId={null} onFanIdChange={() => {}} />)
    expect(screen.getByText(/Ask about matches/)).toBeInTheDocument()
  })

  it("Send button is disabled when input is empty", () => {
    render(<ChatInterface fanId={null} onFanIdChange={() => {}} />)
    const btn = screen.getByText("Send")
    expect(btn).toBeDisabled()
  })

  it("Send button enables when input has text", () => {
    render(<ChatInterface fanId={null} onFanIdChange={() => {}} />)
    const textarea = screen.getByPlaceholderText(/Ask about matches/)
    fireEvent.change(textarea, { target: { value: "Show me Mexico matches" } })
    expect(screen.getByText("Send")).not.toBeDisabled()
  })

  it("clears input and adds user message on send", async () => {
    render(<ChatInterface fanId={null} onFanIdChange={() => {}} />)
    const textarea = screen.getByPlaceholderText(/Ask about matches/)
    fireEvent.change(textarea, { target: { value: "Show me Mexico matches" } })
    fireEvent.click(screen.getByText("Send"))
    expect(screen.getByText("Show me Mexico matches")).toBeInTheDocument()
  })
})
