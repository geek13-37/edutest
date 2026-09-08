import { Eye, EyeOff } from "lucide-react";
import { forwardRef, useState } from "react";

import { cn } from "@/lib/utils";
import { Input } from "./input";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  /** контролируемая видимость (иначе управляется внутри) */
  visible?: boolean;
  onVisibleChange?: (v: boolean) => void;
};

export const PasswordInput = forwardRef<HTMLInputElement, Props>(
  ({ className, visible, onVisibleChange, ...props }, ref) => {
    const [internal, setInternal] = useState(false);
    const show = visible ?? internal;
    const setShow = (v: boolean) => {
      onVisibleChange?.(v);
      if (visible === undefined) setInternal(v);
    };
    return (
      <div className="relative">
        <Input
          ref={ref}
          type={show ? "text" : "password"}
          className={cn("pr-10", className)}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow(!show)}
          aria-label={show ? "Скрыть пароль" : "Показать пароль"}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";
