import * as React from "react";
import { cva } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const ToastProvider = ({ children }) => <>{children}</>;

const ToastViewport = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col p-4 md:max-w-[420px] pointer-events-none gap-2",
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = "ToastViewport";

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-xl border p-4 sm:p-5 pr-8 shadow-lg transition-all",
  {
    variants: {
      variant: {
        default: "border bg-card text-card-foreground shadow-md",
        destructive:
          "destructive group border-destructive bg-destructive text-destructive-foreground shadow-md",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Toast = React.forwardRef(
  ({ className, variant, open, duration, onOpenChange, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(toastVariants({ variant }), className)}
        {...props}
      />
    );
  }
);
Toast.displayName = "Toast";

const ToastAction = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      className
    )}
    {...props}
  />
));
ToastAction.displayName = "ToastAction";

const ToastClose = React.forwardRef(({ className, onClick, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn(
      "absolute right-2 top-2 h-7 w-7 rounded-md p-1 text-muted-foreground opacity-100 hover:opacity-100 hover:text-foreground hover:bg-muted/80 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer transition-all flex items-center justify-center group-[.destructive]:text-red-200 group-[.destructive]:hover:text-white group-[.destructive]:hover:bg-red-900/40",
      className
    )}
    aria-label="Fechar"
    toast-close=""
    onClick={onClick}
    {...props}
  >
    <X className="h-4 w-4" />
  </button>
));
ToastClose.displayName = "ToastClose";

const ToastTitle = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm font-semibold tracking-tight", className)}
    {...props}
  />
));
ToastTitle.displayName = "ToastTitle";

const ToastDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-xs sm:text-sm text-muted-foreground leading-snug", className)}
    {...props}
  />
));
ToastDescription.displayName = "ToastDescription";

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};
