import { render, screen } from "@testing-library/react"
import TripCard from "../components/TripCard"

const baseProps = {
  tripId: "trip001",
  legs: [
    {
      match_number: 18,
      stage: "Group Stage",
      team_a: "England",
      team_b: "France",
      date: "2026-06-24",
      kickoff_local: "17:00",
      stadium: "AT&T Stadium",
      city: "Arlington",
      atmosphere_score: 97,
      hotel: { name: "Marriott Arlington", price_per_night: 180 },
      transport: "Trinity Railway Express",
      food_spots: ["Pepe & Mito's", "Mi Cocina"],
    },
  ],
  totalEstimatedCost: 2400,
}

describe("TripCard", () => {
  it("renders hotel name", () => {
    render(<TripCard {...baseProps} />)
    expect(screen.getByText(/Marriott Arlington/)).toBeInTheDocument()
  })

  it("renders transport info", () => {
    render(<TripCard {...baseProps} />)
    expect(screen.getByText(/Trinity Railway Express/)).toBeInTheDocument()
  })

  it("renders total cost", () => {
    render(<TripCard {...baseProps} />)
    expect(screen.getByText(/2,400/)).toBeInTheDocument()
  })

  it("renders food spots", () => {
    render(<TripCard {...baseProps} />)
    expect(screen.getByText(/Mi Cocina/)).toBeInTheDocument()
  })

  it("renders leg city", () => {
    render(<TripCard {...baseProps} />)
    expect(screen.getByText(/Arlington/)).toBeInTheDocument()
  })
})
