import * as React from "react"
import { useState, useRef } from "react"
import { Badge, Button, Form, Stack } from "react-bootstrap"

interface AliasInputProps {
  aliases: string[]
  onChange: (aliases: string[]) => void
  placeholder?: string
  label?: string
  className?: string
}

const AliasInput: React.FunctionComponent<AliasInputProps> = ({
  aliases,
  onChange,
  placeholder = "Type to add aliases...",
  label,
  className = "",
}) => {
  const [inputValue, setInputValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const addAlias = (alias: string) => {
    const trimmedAlias = alias.trim()
    if (trimmedAlias && !aliases.includes(trimmedAlias)) {
      onChange([...aliases, trimmedAlias])
    }
    setInputValue("")
    inputRef.current?.focus()
  }

  const removeAlias = (aliasToRemove: string) => {
    onChange(aliases.filter((alias) => alias !== aliasToRemove))
    inputRef.current?.focus()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value

    // Handle comma-separated input
    if (value.includes(",")) {
      const newAliases = value
        .split(",")
        .map((alias) => alias.trim())
        .filter((alias) => alias.length > 0)
      const uniqueNewAliases = newAliases.filter(
        (alias) => !aliases.includes(alias)
      )
      if (uniqueNewAliases.length > 0) {
        onChange([...aliases, ...uniqueNewAliases])
      }
      setInputValue("")
      return
    }

    setInputValue(value)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "Enter":
        e.preventDefault()
        if (inputValue.trim()) {
          addAlias(inputValue.trim())
        }
        break

      // Backspace removal disabled - use X button to remove aliases
    }
  }

  return (
    <div className={className}>
      {label && <Form.Label>{label}</Form.Label>}

      {/* Selected Aliases Display */}
      {aliases.length > 0 && (
        <div className="mb-2">
          <Stack direction="horizontal" gap={1} className="flex-wrap">
            {aliases.map((alias, index) => (
              <Badge
                key={index}
                bg="secondary"
                className="d-flex align-items-center"
                style={{ fontSize: "0.9rem" }}
              >
                {alias}
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 ms-1 text-white"
                  style={{ fontSize: "0.8rem", lineHeight: 1 }}
                  onClick={() => removeAlias(alias)}
                  aria-label={`Remove ${alias} alias`}
                >
                  ×
                </Button>
              </Badge>
            ))}
          </Stack>
        </div>
      )}

      {/* Input Field */}
      <Form.Control
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />

      <Form.Text className="text-muted">
        Press Enter or use commas to add multiple aliases
      </Form.Text>
    </div>
  )
}

export default AliasInput
