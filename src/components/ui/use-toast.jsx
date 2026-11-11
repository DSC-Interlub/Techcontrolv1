import { useState, useEffect } from "react";

const TOAST_LIMIT = 3;
const TOAST_REMOVE_DELAY = 300;

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
};

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

const toastTimeouts = new Map();

const clearTimers = (toastId) => {
  const autoTimer = toastTimeouts.get(`auto_${toastId}`);
  if (autoTimer) {
    clearTimeout(autoTimer);
    toastTimeouts.delete(`auto_${toastId}`);
  }
  const removeTimer = toastTimeouts.get(`remove_${toastId}`);
  if (removeTimer) {
    clearTimeout(removeTimer);
    toastTimeouts.delete(`remove_${toastId}`);
  }
};

const addToRemoveQueue = (toastId) => {
  if (toastTimeouts.has(`remove_${toastId}`)) {
    return;
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(`remove_${toastId}`);
    dispatch({
      type: actionTypes.REMOVE_TOAST,
      toastId,
    });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(`remove_${toastId}`, timeout);
};

export const reducer = (state, action) => {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case actionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };

    case actionTypes.DISMISS_TOAST: {
      const { toastId } = action;

      if (toastId) {
        clearTimers(toastId);
        addToRemoveQueue(toastId);
      } else {
        state.toasts.forEach((toast) => {
          clearTimers(toast.id);
          addToRemoveQueue(toast.id);
        });
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      };
    }

    case actionTypes.REMOVE_TOAST:
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        };
      }
      clearTimers(action.toastId);
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };

    default:
      return state;
  }
};

const listeners = [];

let memoryState = { toasts: [] };

function dispatch(action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

function toast({ duration, ...props }) {
  const id = genId();
  const effectiveDuration =
    duration !== undefined
      ? duration
      : props.variant === "destructive"
      ? 8000
      : 5000;

  const update = (newProps) =>
    dispatch({
      type: actionTypes.UPDATE_TOAST,
      toast: { ...newProps, id },
    });

  const dismiss = () =>
    dispatch({ type: actionTypes.DISMISS_TOAST, toastId: id });

  // Auto-dismiss garantido
  if (effectiveDuration !== Infinity && effectiveDuration > 0) {
    const timer = setTimeout(() => {
      dismiss();
    }, effectiveDuration);
    toastTimeouts.set(`auto_${id}`, timer);
  }

  dispatch({
    type: actionTypes.ADD_TOAST,
    toast: {
      ...props,
      duration: effectiveDuration,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
    },
  });

  return {
    id,
    dismiss,
    update,
  };
}

function useToast() {
  const [state, setState] = useState(memoryState);

  useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []); // Dependência vazia []

  return {
    ...state,
    toast,
    dismiss: (toastId) => dispatch({ type: actionTypes.DISMISS_TOAST, toastId }),
  };
}

export { useToast, toast };
