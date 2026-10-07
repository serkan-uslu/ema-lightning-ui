"use client";
import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { Trash2, X } from "lucide-react";
import { Button, IconButton, Spinner } from "../atoms";

const focusableSelector =
  'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]';

/** Accessible destructive-action dialog. Callers own the action and errors. */
export function ConfirmationModal({
  title,
  children,
  confirmLabel,
  cancelLabel,
  closeLabel,
  pendingLabel,
  pending,
  blocked,
  error,
  returnFocus,
  onCancel,
  onConfirm,
}: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  closeLabel: string;
  pendingLabel: string;
  pending: boolean;
  blocked?: boolean;
  error?: string;
  /** Captured by the caller before the background becomes inert. */
  returnFocus: HTMLElement | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const id = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus = returnFocus;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancel.current?.focus();
    const keepFocus = (event: FocusEvent) => {
      if (!dialog.current?.contains(event.target as Node)) {
        const target = cancel.current?.disabled
          ? dialog.current
          : cancel.current;
        target?.focus();
      }
    };
    document.addEventListener("focusin", keepFocus);
    return () => {
      document.removeEventListener("focusin", keepFocus);
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus();
      else
        document
          .querySelector<HTMLAnchorElement>('a[href="/projects"]')
          ?.focus();
    };
  }, [returnFocus]);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onCancel();
      }}
    >
      <div
        ref={dialog}
        className="modal confirmation-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        aria-busy={pending}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            if (!pending) onCancel();
          }
          if (event.key !== "Tab") return;
          const items = Array.from(
            dialog.current?.querySelectorAll<HTMLElement>(focusableSelector) ??
              [],
          );
          const first = items[0];
          const last = items.at(-1);
          if (!first || !last) {
            event.preventDefault();
            dialog.current?.focus();
          } else if (
            event.shiftKey &&
            (document.activeElement === first ||
              document.activeElement === dialog.current)
          ) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }}
      >
        <div className="modal-head">
          <span className="confirmation-icon" aria-hidden="true">
            <Trash2 size={22} />
          </span>
          <IconButton label={closeLabel} onClick={onCancel} disabled={pending}>
            <X size={20} />
          </IconButton>
        </div>
        <h2 id={`${id}-title`}>{title}</h2>
        <div className="confirmation-description" id={`${id}-description`}>
          {children}
        </div>
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions confirmation-actions">
          <Button ref={cancel} disabled={pending} onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            className="btn-danger"
            disabled={pending || blocked}
            onClick={onConfirm}
          >
            {pending ? <Spinner size={16} /> : <Trash2 size={16} />}
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
