import * as React from "react"
import { Button, FloatingLabel, Form, Modal } from "react-bootstrap"
import { Command } from "@helpasaur/types"
import { useHelpaApi } from "../hooks/useHelpaApi"
import TagInput from "./TagInput"
import AliasInput from "./AliasInput"

type CommandFormModel = Partial<Command>

interface CommandFormModalProps {
  command: CommandFormModel
  show: boolean
  onHide: () => void
  onSubmit: (command: Partial<Command>) => void
}

const CommandFormModal: React.FunctionComponent<CommandFormModalProps> = (
  props
) => {
  const [command, setCommand] = React.useState(() => ({
    command: props.command.command || "",
    response: props.command.response || "",
    aliases: props.command.aliases || [],
    tags: props.command.tags || [],
    ...props.command,
  }))
  const { show, onHide, onSubmit } = props
  const { data: tagStats = [] } = useHelpaApi().useTagStats({
    enabled: show, // Only fetch when modal is shown
  })

  // Extract tag names from stats (this is working in CommandsList)
  const existingTags = tagStats.map((stat) => stat.tag)

  React.useEffect(() => {
    setCommand({
      command: props.command.command || "",
      response: props.command.response || "",
      aliases: props.command.aliases || [],
      tags: props.command.tags || [],
      ...props.command,
    })
  }, [props.command])

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const key = e.target.name
    const value = e.target.value

    setCommand((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleSubmit = () => {
    onSubmit(command)
  }

  return (
    <Modal show={show} onHide={onHide} centered={true}>
      <Modal.Header closeButton>
        <Modal.Title>
          {command._id ? `Editing: ${command.command}` : "New Command"}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <FloatingLabel
          controlId="commandName"
          label="Command name"
          className="mb-3"
        >
          <Form.Control
            type="text"
            placeholder="obaeb"
            name="command"
            value={command.command || ""}
            onChange={handleChange}
          />
        </FloatingLabel>
        <FloatingLabel
          controlId="commandResponse"
          label="Response"
          className="mb-3"
        >
          <Form.Control
            as="textarea"
            placeholder="Stop! Don't shoot fire stick in space canoe! Cause explosive decompression! You can crush me but you can't crush my spirit! Why, those are the Grunka-Lunkas! They work here in the Slurm factory. If rubbin' frozen dirt in your crotch is wrong, hey I don't wanna be right."
            style={{ height: "200px" }}
            name="response"
            value={command.response || ""}
            onChange={handleChange}
          />
        </FloatingLabel>

        {/* Aliases Input with Badge UI */}
        <AliasInput
          aliases={command.aliases || []}
          onChange={(aliases) => setCommand((prev) => ({ ...prev, aliases }))}
          placeholder="Type alias and press Enter..."
          label="Command Aliases"
          className="mb-3"
        />

        {/* Tags Input with Typeahead */}
        <TagInput
          tags={command.tags || []}
          existingTags={existingTags}
          onChange={(tags) => setCommand((prev) => ({ ...prev, tags }))}
          placeholder="Type to search existing tags or add new ones..."
          label="Tags"
          className="mb-3"
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={onHide}>
          Cancel
        </Button>
        <Button variant="dark" onClick={handleSubmit}>
          <i className="fa-regular fa-floppy-disk px-1"></i> Save Changes
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default CommandFormModal
