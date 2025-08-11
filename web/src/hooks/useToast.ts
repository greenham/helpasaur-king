import { useContext } from "react"
import { ToastContext } from "../contexts/toasts"

export const useToast = () => useContext(ToastContext)
