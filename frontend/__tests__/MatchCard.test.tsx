import { render, screen } from "@testing-library/react"
import MatchCard from "../components/MatchCard"

const baseProps = {
  matchNumber: 18,
  stage: "Group Stage",
  teamA: "England",
  teamB: "France",
  date: "2026-06-24",
  kickoffLocal: "17:00",
  city: "Arlington",
  stadium: "AT&T Stadium",
  atmosphereScore: 97,
  country: "USA",
}

describe("MatchCard", () => {
  it("renders team names", () => {
    render(<MatchCard {...baseProps} />)
    expect(screen.getByText("England")).toBeInTheDocument()
    expect(screen.getByText("France")).toBeInTheDocument()
  })

  it("renders stadium and city", () => {
    render(<MatchCard {...baseProps} />)
    expect(screen.getByText(/AT&T Stadium/)).toBeInTheDocument()
    expect(screen.getByText(/Arlington/)).toBeInTheDocument()
  })

  it("shows green bar for high atmosphere score", () => {
    const { container } = render(<MatchCard {...baseProps} atmosphereScore={90} />)
    const bar = container.querySelector(".bg-green-400")
    expect(bar).toBeInTheDocument()
  })

  it("shows amber bar for mid atmosphere score", () => {
    const { container } = render(<MatchCard {...baseProps} atmosphereScore={60} />)
    const bar = container.querySelector(".bg-amber-400")
    expect(bar).toBeInTheDocument()
  })

  it("shows red bar for low atmosphere score", () => {
    const { container } = render(<MatchCard {...baseProps} atmosphereScore={40} />)
    const bar = container.querySelector(".bg-red-400")
    expect(bar).toBeInTheDocument()
  })
})
