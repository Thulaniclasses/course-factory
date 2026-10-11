"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface EditableTextProps {
  value: string;
  onChange: (newValue: string) => void;
  multiline?: boolean;
  className?: string;
  placeholder?: string;
  as?: "span" | "p" | "h1" | "h2" | "h3" | "div";
  disabled?: boolean;
}

export function EditableText({
  value,
  onChange,
  multiline = false,
  className,
  placeholder = "Click to edit...",
  as: Tag = "span",
  disabled = false,
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  // Sync draft when external value changes (e.g., different course)
  useEffect(() => {
    if (!isEditing) setDraft(value);
  }, [value, isEditing]);

  // Auto-focus when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Move cursor to end
      const len = inputRef.current.value.length;
      inputRef.current.setSelectionRange(len, len);
    }
  }, [isEditing]);

  const commit = () => {
    setIsEditing(false);
    if (draft !== value) {
      onChange(draft);
    }
  };

  const cancel = () => {
    setDraft(value);
    setIsEditing(false);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>
  ) => {
    if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
    // For single-line: Enter commits
    if (!multiline && e.key === "Enter") {
      e.preventDefault();
      commit();
    }
    // For multi-line: Cmd/Ctrl+Enter commits
    if (multiline && (e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      commit();
    }
  };

  // ---------------- EDIT MODE ----------------
  if (isEditing && !disabled) {
    const sharedProps = {
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) =>
        setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: handleKeyDown,
      className: cn(
        "w-full bg-neutral-900 border border-blue-500/60 rounded-md px-2 py-1 text-inherit",
        "focus:outline-none focus:ring-2 focus:ring-blue-500/40",
        "resize-none",
        className
      ),
      placeholder,
    };

    if (multiline) {
      return (
        <textarea
          {...sharedProps}
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          rows={Math.max(2, draft.split("\n").length + 1)}
        />
      );
    }

    return (
      <input
        type="text"
        {...sharedProps}
        ref={inputRef as React.RefObject<HTMLInputElement>}
      />
    );
  }

  // ---------------- DISPLAY MODE ----------------
  return (
    <Tag
      onClick={() => !disabled && setIsEditing(true)}
      title={undefined}
      className={cn(
        !disabled && "cursor-text hover:bg-neutral-800/40 rounded px-0.5 -mx-0.5 transition-colors",
        !value && !disabled && "italic text-neutral-500",
        className
      )}
    >
      {value || placeholder}
    </Tag>
  );
}
