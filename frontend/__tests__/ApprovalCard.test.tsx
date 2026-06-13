import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { jest } from "@jest/globals"
import ApprovalCard from "../components/ApprovalCard"

jest.mock("../lib/api", () => ({
  approveAction: jest.fn(() => Promise.resolve({ applied: true })),
  rejectAction:  jest.fn(() => Promise.resolve({ rejected: true })),
}))

const baseProps = {
  actionId:  "action001",
  summary:   "Mexico advanced! Hotel found at $142/nt in Kansas City.",
  createdAt: "2026-06-20T21:00:00Z",
  onApprove: jest.fn(),
  onReject:  jest.fn(),
}

describe("ApprovalCard", () => {
  beforeEach(() => jest.clearAllMocks())

  it("renders summary text", () => {
    render(<ApprovalCard {...baseProps} />)
    expect(screen.getByText(/Mexico advanced/)).toBeInTheDocument()
  })

  it("calls onApprove after clicking Approve", async () => {
    render(<ApprovalCard {...baseProps} />)
    fireEvent.click(screen.getByText("Approve"))
    await waitFor(() => expect(baseProps.onApprove).toHaveBeenCalledWith("action001"))
  })

  it("calls onReject after clicking Reject", async () => {
    render(<ApprovalCard {...baseProps} />)
    fireEvent.click(screen.getByText("Reject"))
    await waitFor(() => expect(baseProps.onReject).toHaveBeenCalledWith("action001"))
  })

  it("disables buttons while loading", async () => {
    render(<ApprovalCard {...baseProps} />)
    fireEvent.click(screen.getByText("Approve"))
    const rejectBtn = screen.getByText("Reject")
    expect(rejectBtn).toBeDisabled()
  })
})
