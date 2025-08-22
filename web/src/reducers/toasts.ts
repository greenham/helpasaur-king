interface Toast {
  id: string | number
  message?: string
  type?: string
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
    default:
      throw new Error(`Unhandled action type: ${(action as any).type}`)
  }
}
