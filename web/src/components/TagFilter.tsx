import * as React from "react"
import { ButtonGroup, Col, Row, ToggleButton } from "react-bootstrap"

interface TagFilterProps {
  tagStats: Array<{ tag: string; count: number }>
  selectedTag: string
  onTagChange: (tag: string) => void
  totalCommands: number
}

const TagFilter: React.FunctionComponent<TagFilterProps> = ({
  tagStats,
  selectedTag,
  onTagChange,
  totalCommands,
}) => {
  if (tagStats.length === 0) {
    return null
  }

  return (
    <Row className="mb-4">
      <Col>
        {/* <h5 className="text-center">Filter by Tags</h5> */}
        <ButtonGroup className="mb-3 flex-wrap d-flex justify-content-center">
          <ToggleButton
            key="all-tags"
            id="tag-all"
            type="radio"
            variant="outline-primary"
            name="tag"
            value="all"
            checked={selectedTag === "all"}
            onChange={(e) => onTagChange(e.currentTarget.value)}
          >
            All ({totalCommands})
          </ToggleButton>
          {tagStats.map((stat) => (
            <ToggleButton
              key={stat.tag}
              id={`tag-${stat.tag}`}
              type="radio"
              variant="outline-primary"
              name="tag"
              value={stat.tag}
              checked={selectedTag === stat.tag}
              onChange={(e) => onTagChange(e.currentTarget.value)}
            >
              {stat.tag} ({stat.count})
            </ToggleButton>
          ))}
        </ButtonGroup>
      </Col>
    </Row>
  )
}

export default TagFilter