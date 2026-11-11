import { useToast } from "@/components/ui/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  const toastsVisiveis = toasts.filter((t) => t.open !== false);

  return (
    <ToastProvider>
      <ToastViewport>
        {toastsVisiveis.map(function ({
          id,
          title,
          description,
          action,
          open,
          duration,
          onOpenChange,
          ...props
        }) {
          return (
            <Toast key={id} {...props}>
              <div className="grid gap-1 flex-1 pr-6">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
              {action}
              <ToastClose
                onClick={(e) => {
                  e?.stopPropagation?.();
                  dismiss(id);
                }}
              />
            </Toast>
          );
        })}
      </ToastViewport>
    </ToastProvider>
  );
}
