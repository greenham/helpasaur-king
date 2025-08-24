interface Toast {
  id: string | number
  message?: string
  type?: string
  variant?: string
}

interface ToastState {
  toasts: Toast[]
}

type ToastAction =
  | { type: "ADD_TOAST"; payload: Toast }
  | { type: "DELETE_TOAST"; payload: string | number }

export const toastReducer = (
  state: ToastState,
  action: ToastAction
): ToastState => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [...state.toasts, action.payload],
      }
    case "DELETE_TOAST": {
      const updatedToasts = state.toasts.filter(
        (toast) => toast.id !== action.payload
      )
      return {
        ...state,
        toasts: updatedToasts,
      }
    }
    default: {
      const exhaustiveCheck: never = action
      throw new Error(
        `Unhandled action type: ${(exhaustiveCheck as ToastAction).type}`
      )
    }
  }
}
