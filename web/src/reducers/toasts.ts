export const toastReducer = (state: any, action: any) => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [...state.toasts, action.payload],
      }
    case "DELETE_TOAST":
      const updatedToasts = state.toasts.filter(
        (toast: any) => toast.id !== action.payload
      )
      return {
        ...state,
        toasts: updatedToasts,
      }
    default:
      throw new Error(`Unhandled action type: ${action.type}`)
  }
}
