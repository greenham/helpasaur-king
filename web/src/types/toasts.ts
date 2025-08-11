export interface IToast {
  id: number
  variant: "success" | "warning" | "info" | "error"
  message?: string
}
