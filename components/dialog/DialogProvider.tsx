"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import AppDialog, { type DialogType } from "./AppDialog";

export interface DialogOptions {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  defaultValue?: string;
  inputPlaceholder?: string;
  variant?: "default" | "danger";
}

type AlertType = "info" | "success" | "warning" | "error";

interface DialogRequest {
  id: number;
  type: DialogType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  defaultValue?: string;
  inputPlaceholder?: string;
  variant?: "default" | "danger";
  inputValue?: string;
  resolve: (value: unknown) => void;
}

interface AppDialogContextValue {
  showAlert: (
    message: string,
    options?: DialogOptions & { type?: AlertType },
  ) => Promise<void>;
  showConfirm: (
    message: string,
    options?: DialogOptions,
  ) => Promise<boolean>;
  showPrompt: (
    message: string,
    defaultValue?: string,
    options?: DialogOptions,
  ) => Promise<string | null>;
}

const AppDialogContext = createContext<AppDialogContextValue | null>(null);

interface DialogProviderProps {
  children: ReactNode;
}

function cancelledResult(type: DialogType): unknown {
  if (type === "confirm") return false;
  if (type === "prompt") return null;
  return undefined;
}

export function DialogProvider({ children }: DialogProviderProps) {
  const [current, setCurrent] = useState<DialogRequest | null>(null);

  const currentRef = useRef<DialogRequest | null>(null);
  const queueRef = useRef<DialogRequest[]>([]);
  const nextIdRef = useRef(1);
  const mountedRef = useRef(false);

  const publishCurrent = useCallback((request: DialogRequest | null) => {
    currentRef.current = request;
    setCurrent(request);
  }, []);

  const enqueue = useCallback(
    <T,>(
      type: DialogType,
      message: string,
      options: DialogOptions = {},
      defaultValue?: string,
    ): Promise<T> =>
      new Promise<T>((resolve) => {
        const request: DialogRequest = {
  id: nextIdRef.current++,
  type,
  title: options.title ?? "",
  message,
  confirmText: options.confirmText,
  cancelText: options.cancelText,
  defaultValue,
  inputPlaceholder: options.inputPlaceholder,
  variant: options.variant ?? "default",
  inputValue: defaultValue ?? "",
  resolve: (value) => resolve(value as T),
};

        if (!mountedRef.current) {
          request.resolve(cancelledResult(type) as T);
          return;
        }

        if (currentRef.current === null) {
          publishCurrent(request);
        } else {
          queueRef.current.push(request);
        }
      }),
    [publishCurrent],
  );

  const finish = useCallback(
    (result: unknown) => {
      const completed = currentRef.current;
      if (!completed) return;

      const next = queueRef.current.shift() ?? null;

      // Update the ref immediately before React processes the render.
      publishCurrent(next);
      completed.resolve(result);
    },
    [publishCurrent],
  );

  const showAlert = useCallback(
    (
      message: string,
      options: DialogOptions & { type?: AlertType } = {},
    ) => enqueue<void>(options.type ?? "info", message, options),
    [enqueue],
  );

  const showConfirm = useCallback(
    (message: string, options: DialogOptions = {}) =>
      enqueue<boolean>("confirm", message, options),
    [enqueue],
  );

  const showPrompt = useCallback(
    (
      message: string,
      defaultValue = "",
      options: DialogOptions = {},
    ) => enqueue<string | null>("prompt", message, options, defaultValue),
    [enqueue],
  );

  const updateInput = useCallback((id: number, value: string) => {
    const active = currentRef.current;
    if (!active || active.id !== id) return;

    const updated = { ...active, inputValue: value };
    currentRef.current = updated;
    setCurrent(updated);
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      const pending = [
        ...(currentRef.current ? [currentRef.current] : []),
        ...queueRef.current,
      ];

      currentRef.current = null;
      queueRef.current = [];

      pending.forEach((request) => {
        request.resolve(cancelledResult(request.type));
      });
    };
  }, []);

  const contextValue = useRef<AppDialogContextValue>({
    showAlert,
    showConfirm,
    showPrompt,
  });

  contextValue.current = {
    showAlert,
    showConfirm,
    showPrompt,
  };

  return (
    <AppDialogContext.Provider value={contextValue.current}>
      {children}

      {current && (
        <AppDialog
          key={current.id}
          open={true}
          type={current.type}
          title={current.title}
          message={current.message}
          variant={current.variant}
          confirmText={current.confirmText}
          cancelText={current.cancelText}
          defaultValue={current.defaultValue}
          inputPlaceholder={current.inputPlaceholder}
          inputValue={current.inputValue}
          onInputChange={(value) => updateInput(current.id, value)}
          onConfirm={() => {
            finish(
              current.type === "prompt"
                ? current.inputValue ?? ""
                : current.type === "confirm"
                  ? true
                  : undefined,
            );
          }}
          onCancel={() => {
            finish(cancelledResult(current.type));
          }}
        />
      )}
    </AppDialogContext.Provider>
  );
}

export function useAppDialog(): AppDialogContextValue {
  const context = useContext(AppDialogContext);

  if (!context) {
    throw new Error("useAppDialog must be used within a DialogProvider.");
  }

  return context;
}
