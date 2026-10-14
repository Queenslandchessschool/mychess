"use client";

import { useEffect, useRef } from "react";

export type DialogType =
  | "info"
  | "success"
  | "warning"
  | "error"
  | "confirm"
  | "prompt";

export type DialogVariant = "default" | "danger";

export interface AppDialogProps {
  open: boolean;
  type: DialogType;
  title: string;
  message: string;
  variant?: DialogVariant;
  confirmText?: string;
  cancelText?: string;
  defaultValue?: string;
  inputPlaceholder?: string;
  inputValue?: string;
  onInputChange?: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const dialogStyles: Record<
  DialogType,
  {
    icon: string;
    iconColor: string;
    iconBg: string;
    defaultTitle: string;
    gradientFrom: string;
    gradientVia: string;
  }
> = {
  info: {
    icon: "i",
    iconColor: "#2459A9",
    iconBg: "#E8F1FF",
    defaultTitle: "Information",
    gradientFrom: "#F7D968",
    gradientVia: "#D4AF37",
  },
  success: {
    icon: "✓",
    iconColor: "#18794E",
    iconBg: "#E5F6EC",
    defaultTitle: "Success",
    gradientFrom: "#C7EBD2",
    gradientVia: "#A7DDB8",
  },
  warning: {
    icon: "!",
    iconColor: "#B42318",
    iconBg: "#FCE8E6",
    defaultTitle: "Warning",
    gradientFrom: "#F8D0D0",
    gradientVia: "#EFA3A3",
  },
  error: {
    icon: "×",
    iconColor: "#B42318",
    iconBg: "#FCE8E6",
    defaultTitle: "Error",
    gradientFrom: "#F8D0D0",
    gradientVia: "#EFA3A3",
  },
  confirm: {
    icon: "?",
    iconColor: "#18794E",
    iconBg: "#E5F6EC",
    defaultTitle: "Please Confirm",
    gradientFrom: "#C7EBD2",
    gradientVia: "#A7DDB8",
  },
  prompt: {
    icon: "✎",
    iconColor: "#2459A9",
    iconBg: "#E8F1FF",
    defaultTitle: "Enter Value",
    gradientFrom: "#F7D968",
    gradientVia: "#D4AF37",
  },
};

const dangerStyle = {
  icon: "!",
  iconColor: "#B42318",
  iconBg: "#FCE8E6",
  gradientFrom: "#F8D0D0",
  gradientVia: "#EFA3A3",
};

export default function AppDialog({
  open,
  type,
  title,
  message,
  variant = "default",
  confirmText,
  cancelText,
  defaultValue,
  inputPlaceholder,
  inputValue,
  onInputChange,
  onConfirm,
  onCancel,
}: AppDialogProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isDanger = variant === "danger";
  const baseStyle = dialogStyles[type];
  const style = isDanger
    ? { ...baseStyle, ...dangerStyle }
    : baseStyle;

  const isConfirm = type === "confirm";
  const isPrompt = type === "prompt";
  const needsCancel = isConfirm || isPrompt;

  const onConfirmRef = useRef(onConfirm);
  const onCancelRef = useRef(onCancel);

  useEffect(() => {
    onConfirmRef.current = onConfirm;
  }, [onConfirm]);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    if (!open) return;

    if (type === "prompt") {
      inputRef.current?.focus();
    } else {
      confirmButtonRef.current?.focus();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancelRef.current();
        return;
      }

      if (
        event.key === "Enter" &&
        type === "confirm" &&
        !event.isComposing
      ) {
        event.preventDefault();
        onConfirmRef.current();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, type]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-[#10213A]/60 px-3 py-4 backdrop-blur-[2px] sm:px-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancelRef.current();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-dialog-title"
        aria-describedby="app-dialog-message"
        className="relative flex max-h-[min(90dvh,720px)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-[#D9E0E8] bg-[#FFFDF8] shadow-2xl"
      >
        <div
          aria-hidden="true"
          className="h-[6px] shrink-0"
          style={{
            backgroundImage: "linear-gradient(to right, " + style.gradientFrom + ", " + style.gradientVia + ", transparent)",
          }}
        />

        <div className="overflow-y-auto overscroll-contain px-5 py-6 sm:px-7 sm:py-7">
          <div className="flex items-start gap-3">
            <div
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl font-bold"
              style={{
                color: style.iconColor,
                backgroundColor: style.iconBg,
              }}
            >
              {style.icon}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#B28A22]">
                QUEENSLAND CHESS SCHOOL
              </p>

              <h2
                id="app-dialog-title"
                className="mt-2 break-words text-xl font-bold tracking-tight text-[#10213A] sm:text-2xl"
              >
                {title || style.defaultTitle}
              </h2>
            </div>
          </div>

          <p
            id="app-dialog-message"
            className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-[#64748B]"
          >
            {message}
          </p>

          {isPrompt && (
            <input
              ref={inputRef}
              type="text"
              value={inputValue ?? defaultValue ?? ""}
              onChange={(event) =>
                onInputChange?.(event.target.value)
              }
              placeholder={inputPlaceholder ?? ""}
              className="mt-5 min-h-12 w-full rounded-xl border border-[#D9E0E8] bg-white px-4 py-3 text-base text-[#10213A] outline-none transition focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/30"
            />
          )}

          <div
            className={`mt-6 flex flex-col-reverse gap-3 ${
              needsCancel ? "sm:flex-row sm:justify-end" : ""
            }`}
          >
            {needsCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="min-h-12 w-full rounded-xl border border-[#D4AF37] bg-white px-5 py-3 text-sm font-semibold text-[#10213A] transition hover:bg-[#FFF8DF] active:scale-[0.98] sm:w-auto"
              >
                {cancelText ?? "Cancel"}
              </button>
            )}

            <button
              ref={confirmButtonRef}
              type="button"
              onClick={onConfirm}
              className={`min-h-12 w-full rounded-xl border px-5 py-3 text-sm font-semibold shadow-sm transition active:scale-[0.98] sm:w-auto ${
                isDanger
                  ? "border-red-600 bg-red-600 text-white hover:bg-red-700"
                  : "border-[#D4AF37] bg-[#D4AF37] text-[#10213A] hover:bg-[#F4D35E]"
              }`}
            >
              {confirmText ??
                (type === "confirm"
                  ? "Confirm"
                  : type === "prompt"
                    ? "Submit"
                    : "Done")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}