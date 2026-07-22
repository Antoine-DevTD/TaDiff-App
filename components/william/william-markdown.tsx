"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function WilliamMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ children: linkChildren, href }) => (
          <a
            className="font-medium text-accent underline underline-offset-2"
            href={href}
            rel="noreferrer"
            target="_blank"
          >
            {linkChildren}
          </a>
        ),
        li: ({ children: itemChildren }) => <li className="ml-4 pl-1">{itemChildren}</li>,
        ol: ({ children: listChildren }) => <ol className="my-2 list-decimal space-y-1">{listChildren}</ol>,
        p: ({ children: paragraphChildren }) => (
          <p className="my-2 first:mt-0 last:mb-0">{paragraphChildren}</p>
        ),
        strong: ({ children: strongChildren }) => (
          <strong className="font-semibold text-foreground">{strongChildren}</strong>
        ),
        ul: ({ children: listChildren }) => <ul className="my-2 list-disc space-y-1">{listChildren}</ul>,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
