import * as React from "react";

const LinkifyText = ({ text }: { text: string }) => {
  // Regular expression to identify URLs in text
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  // Split the text into parts, where URLs are and where they are not
  const parts = text.split(urlRegex);

  // Map the parts to React elements, making URLs clickable
  const elements = parts.map((part, index) =>
    urlRegex.test(part) ? (
      <a key={index} href={part} target="_blank" rel="noopener noreferrer">
        {part}
      </a>
    ) : (
      <span key={index}>{part}</span>
    )
  );

  return <>{elements}</>;
};

export default LinkifyText;
