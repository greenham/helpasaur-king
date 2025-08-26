import * as React from "react"
import { Col, OverlayTrigger, Row, ToggleButton, Tooltip } from "react-bootstrap"

interface AlphabetFilterProps {
  selectedLetter: string
  onLetterChange: (letter: string) => void
  getLetterCount: (letter: string) => number
}

const AlphabetFilter: React.FunctionComponent<AlphabetFilterProps> = ({
  selectedLetter,
  onLetterChange,
  getLetterCount,
}) => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")
  const numbers = "0123456789".split("")

  const renderLetterButton = (letter: string) => {
    const count = getLetterCount(letter)
    const letterButton = (
      <ToggleButton
        key={letter}
        id={`letter-${letter}`}
        type="radio"
        variant="outline-secondary"
        name="letter"
        value={letter}
        checked={selectedLetter === letter}
        onChange={(e) => onLetterChange(e.currentTarget.value)}
        disabled={count === 0}
        style={{
          fontSize: "1.2rem",
          fontWeight: "bold",
          minWidth: "3rem",
          opacity: count === 0 ? 0.3 : 1,
        }}
      >
        {letter}
      </ToggleButton>
    )

    return count > 0 ? (
      <OverlayTrigger
        key={letter}
        placement="top"
        overlay={
          <Tooltip id={`tooltip-${letter}`}>
            {count} command{count !== 1 ? "s" : ""} starting with "{letter}"
          </Tooltip>
        }
      >
        {letterButton}
      </OverlayTrigger>
    ) : (
      letterButton
    )
  }

  return (
    <Row className="mb-4">
      <Col>
        {/* <h5 className="text-center">Jump to Letter</h5> */}
        <div
          className="mb-3 d-flex flex-wrap justify-content-center"
          style={{ gap: "0.25rem" }}
        >
          {/* First row on mobile: "All" + "#" + first 12 letters (A-L) */}
          <div
            className="d-flex flex-wrap justify-content-center w-100"
            style={{ gap: "0.25rem" }}
          >
            <ToggleButton
              key="all-letters"
              id="letter-all"
              type="radio"
              variant="outline-secondary"
              name="letter"
              value="all"
              checked={selectedLetter === "all"}
              onChange={(e) => onLetterChange(e.currentTarget.value)}
              style={{
                fontSize: "1.2rem",
                fontWeight: "bold",
                minWidth: "3rem",
              }}
            >
              All
            </ToggleButton>
            {(() => {
              // Count commands starting with any number
              const numberCount = numbers.reduce((sum, num) => sum + getLetterCount(num), 0)
              const numberButton = (
                <ToggleButton
                  key="numbers"
                  id="letter-numbers"
                  type="radio"
                  variant="outline-secondary"
                  name="letter"
                  value="0-9"
                  checked={selectedLetter === "0-9"}
                  onChange={(e) => onLetterChange(e.currentTarget.value)}
                  disabled={numberCount === 0}
                  style={{
                    fontSize: "1.2rem",
                    fontWeight: "bold",
                    minWidth: "3rem",
                    opacity: numberCount === 0 ? 0.3 : 1,
                  }}
                >
                  #
                </ToggleButton>
              )
              return numberCount > 0 ? (
                <OverlayTrigger
                  key="numbers"
                  placement="top"
                  overlay={
                    <Tooltip id="tooltip-numbers">
                      {numberCount} command{numberCount !== 1 ? "s" : ""} starting with numbers
                    </Tooltip>
                  }
                >
                  {numberButton}
                </OverlayTrigger>
              ) : (
                numberButton
              )
            })()}
            {alphabet.slice(0, 12).map(renderLetterButton)}
          </div>
          {/* Second row on mobile: last 14 letters (M-Z) */}
          <div
            className="d-flex flex-wrap justify-content-center w-100"
            style={{ gap: "0.25rem" }}
          >
            {alphabet.slice(12).map(renderLetterButton)}
          </div>
        </div>
      </Col>
    </Row>
  )
}

export default AlphabetFilter