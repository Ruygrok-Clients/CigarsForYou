import React from 'react';
import { Link } from 'react-router-dom';
import { parseInlineMarkdown } from '../lib/inlineMarkdown';

const linkStyle: React.CSSProperties = {
  color: '#c06517',
  textUnderlineOffset: '0.15em'
};

export const InlineMarkdown: React.FC<{ text: string }> = ({ text }) => {
  const parts = parseInlineMarkdown(text);
  return (
    <>
      {parts.map((part, index) => {
        if (part.type === 'text') return <React.Fragment key={index}>{part.text}</React.Fragment>;
        if (part.external) {
          return (
            <a key={index} href={part.href} target="_blank" rel="noopener noreferrer" style={linkStyle}>
              {part.text}
            </a>
          );
        }
        return (
          <Link key={index} to={part.href} style={linkStyle}>
            {part.text}
          </Link>
        );
      })}
    </>
  );
};
