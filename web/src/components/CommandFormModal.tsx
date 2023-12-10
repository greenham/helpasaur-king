import * as React from "react";
import { Button, FloatingLabel, Form, Modal } from "react-bootstrap";
import { Command } from "../types/commands";

interface CommandFormModalProps {
  command: Command;
  show: boolean;
  onHide: () => void;
  onSubmit: (command: Command) => void;
}

const CommandFormModal: React.FunctionComponent<CommandFormModalProps> = (
  props
) => {
  const [command, setCommand] = React.useState({ ...props.command });
  const { show, onHide, onSubmit } = props;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const key = e.target.name;
    const value = e.target.value;

    setCommand((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = () => {
    onSubmit(command);
  };

  return (
    <Modal show={show} onHide={onHide}>
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
            value={command.command}
            onChange={handleChange}
          />
        </FloatingLabel>
        <FloatingLabel controlId="commandResponse" label="Response">
          <Form.Control
            as="textarea"
            placeholder="Stop! Don't shoot fire stick in space canoe! Cause explosive decompression! You can crush me but you can't crush my spirit! Why, those are the Grunka-Lunkas! They work here in the Slurm factory. If rubbin' frozen dirt in your crotch is wrong, hey I don't wanna be right."
            style={{ height: "200px" }}
            name="response"
            value={command.response}
            onChange={handleChange}
          />
        </FloatingLabel>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={onHide}>
          Close
        </Button>
        <Button variant="dark" onClick={handleSubmit}>
          <i className="fa-regular fa-floppy-disk px-1"></i> Save Changes
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default CommandFormModal;
