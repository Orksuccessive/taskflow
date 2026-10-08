"use client";

import type { FormHTMLAttributes, ReactNode } from "react";

type ConfirmActionFormProps = Omit<FormHTMLAttributes<HTMLFormElement>, "action" | "onSubmit"> & {
  action: ((formData: FormData) => void | Promise<void>) | string;
  confirmMessage?: string;
  children: ReactNode;
  onSubmit?: (event: any) => void;
};

export function ConfirmActionForm({
  action,
  confirmMessage,
  onSubmit,
  children,
  ...props
}: ConfirmActionFormProps) {
  const handleSubmit = (event: any) => {
    if (confirmMessage && !window.confirm(confirmMessage)) {
      event.preventDefault();
      return;
    }

    onSubmit?.(event);
  };

  return (
    <form action={action} onSubmit={handleSubmit} {...props}>
      {children}
    </form>
  );
}
