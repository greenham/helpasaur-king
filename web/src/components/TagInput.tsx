import * as React from "react"
import { useState, useRef, useEffect } from "react"
import { Badge, Button, Dropdown, Form, Stack } from "react-bootstrap"

interface TagInputProps {
  tags: string[]
  existingTags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  label?: string
  className?: string
}

const TagInput: React.FunctionComponent<TagInputProps> = ({
  tags,
  existingTags,
  onChange,
  placeholder = "Type to add tags...",
  label,
  className = "",
}) => {
  const [inputValue, setInputValue] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Filter existing tags based on input and exclude already selected tags
  const filteredSuggestions = existingTags
    .filter(
      (tag) =>
        tag.toLowerCase().includes(inputValue.toLowerCase()) &&
        !tags.includes(tag)
    )
    .slice(0, 10) // Limit suggestions

  useEffect(() => {
    // Show suggestions if there's input and either existing suggestions OR the input can create a new tag
    const canCreateNew = Boolean(
      inputValue.trim() && !existingTags.includes(inputValue.trim())
    )
    setShowSuggestions(
      inputValue.length > 0 && (filteredSuggestions.length > 0 || canCreateNew)
    )
    setHighlightedIndex(-1)
  }, [inputValue, filteredSuggestions.length, existingTags])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current)
      }
    }
  }, [])

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim()
    if (trimmedTag && !tags.includes(trimmedTag)) {
      onChange([...tags, trimmedTag])
    }
    setInputValue("")
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((tag) => tag !== tagToRemove))
    inputRef.current?.focus()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value

    // Handle comma-separated input
    if (value.includes(",")) {
      const newTags = value
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)
      const uniqueNewTags = newTags.filter((tag) => !tags.includes(tag))
      if (uniqueNewTags.length > 0) {
        onChange([...tags, ...uniqueNewTags])
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
        if (highlightedIndex >= 0 && filteredSuggestions[highlightedIndex]) {
          addTag(filteredSuggestions[highlightedIndex])
        } else if (inputValue.trim()) {
          addTag(inputValue.trim())
        }
        break

      // Backspace removal disabled - use X button to remove tags

      case "ArrowDown":
        e.preventDefault()
        setHighlightedIndex(
          Math.min(highlightedIndex + 1, filteredSuggestions.length - 1)
        )
        break

      case "ArrowUp":
        e.preventDefault()
        setHighlightedIndex(Math.max(highlightedIndex - 1, -1))
        break

      case "Escape":
        setShowSuggestions(false)
        setHighlightedIndex(-1)
        break
    }
  }

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text

    const index = text.toLowerCase().indexOf(query.toLowerCase())
    if (index === -1) return text

    return (
      <>
        {text.substring(0, index)}
        <strong>{text.substring(index, index + query.length)}</strong>
        {text.substring(index + query.length)}
      </>
    )
  }

  return (
    <div className={`position-relative ${className}`}>
      {label && <Form.Label>{label}</Form.Label>}

      {/* Selected Tags Display */}
      {tags.length > 0 && (
        <div className="mb-2">
          <Stack direction="horizontal" gap={1} className="flex-wrap">
            {tags.map((tag, index) => (
              <Badge
                key={index}
                bg="secondary"
                className="d-flex align-items-center"
                style={{ fontSize: "0.9rem" }}
              >
                {tag}
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 ms-1 text-white"
                  style={{ fontSize: "0.8rem", lineHeight: 1 }}
                  onClick={() => removeTag(tag)}
                  aria-label={`Remove ${tag} tag`}
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
        onFocus={() => {
          const canCreateNew = Boolean(
            inputValue.trim() && !existingTags.includes(inputValue.trim())
          )
          setShowSuggestions(
            inputValue.length > 0 &&
              (filteredSuggestions.length > 0 || canCreateNew)
          )
        }}
        onBlur={() => {
          // Clear any existing timeout
          if (blurTimeoutRef.current) {
            clearTimeout(blurTimeoutRef.current)
          }
          // Set new timeout with cleanup reference
          blurTimeoutRef.current = setTimeout(() => {
            setShowSuggestions(false)
            blurTimeoutRef.current = null
          }, 150)
        }}
        placeholder={placeholder}
      />

      {/* Autocomplete Dropdown */}
      {showSuggestions && (
        <Dropdown.Menu
          show
          className="w-100 mt-1"
          style={{ maxHeight: "200px", overflowY: "auto" }}
        >
          {filteredSuggestions.map((tag, index) => (
            <Dropdown.Item
              key={tag}
              active={index === highlightedIndex}
              onClick={() => {
                // Clear blur timeout when clicking suggestion
                if (blurTimeoutRef.current) {
                  clearTimeout(blurTimeoutRef.current)
                  blurTimeoutRef.current = null
                }
                addTag(tag)
              }}
              className="d-flex justify-content-between align-items-center"
            >
              <span>{highlightMatch(tag, inputValue)}</span>
              <Badge bg="secondary" className="ms-2">
                existing
              </Badge>
            </Dropdown.Item>
          ))}
          {inputValue.trim() && !existingTags.includes(inputValue.trim()) && (
            <Dropdown.Item
              active={highlightedIndex === filteredSuggestions.length}
              onClick={() => addTag(inputValue.trim())}
              className="d-flex justify-content-between align-items-center border-top"
            >
              <span>Add "{inputValue.trim()}"</span>
              <Badge bg="success" className="ms-2">
                new
              </Badge>
            </Dropdown.Item>
          )}
        </Dropdown.Menu>
      )}
    </div>
  )
}

export default TagInput
