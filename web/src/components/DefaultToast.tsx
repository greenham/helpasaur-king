import * as React from "react"
import { Toast } from "react-bootstrap"
import { IToast } from "../types/toasts"
import { useToast } from "../hooks/useToast"

export interface ToastVariant {
  icon: React.ReactNode
  bgClass: string
  title: string
  textClass?: string
  closeButtonClass: string
}

export interface ToastVariants {
  [key: string]: ToastVariant
}

const toastVariants: ToastVariants = {
  success: {
    icon: <i className="fa-regular fa-circle-check px-1 text-dark"></i>,
    bgClass: "success",
    title: "Success!",
    textClass: "text-dark",
    closeButtonClass: "toast-close-dark",
  },
  warning: {
    icon: <i className="fa-solid fa-triangle-exclamation px-1 text-dark"></i>,
    bgClass: "warning",
    title: "Warning!",
    textClass: "text-body-emphasis",
    closeButtonClass: "toast-close-dark",
  },
  info: {
    icon: <i className="fa-solid fa-circle-info px-1 text-white"></i>,
    bgClass: "info",
    title: "Info",
    textClass: "text-body-emphasis",
    closeButtonClass: "toast-close-light",
  },
  error: {
    icon: <i className="fa-solid fa-bug px-1 text-white"></i>,
    bgClass: "danger",
    title: "Error!",
    textClass: "text-body-emphasis",
    closeButtonClass: "toast-close-light",
  },
}

const DefaultToast: React.FunctionComponent<IToast> = (props) => {
  const { variant, message, id } = props
  const toastVariant = toastVariants[variant]
  const [show, setShow] = React.useState(true)
  const toast = useToast()
  return (
    <Toast
      bg={toastVariant.bgClass}
      onClose={() => {
        setShow(false)
      }}
      onExited={() => {
        toast.remove(id)
      }}
      show={show}
      delay={5000}
      autohide
      className="toast-custom"
    >
      <Toast.Body className="toast-body-custom d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center">
          <span className="me-2">{toastVariant.icon}</span>
          <span className={toastVariant.textClass}>{message}</span>
        </div>
        <button
          type="button"
          className={`toast-close-btn ${toastVariant.closeButtonClass} btn p-1 ms-2`}
          aria-label="Close"
          onClick={() => setShow(false)}
        >
          ×
        </button>
      </Toast.Body>
    </Toast>
  )
}

export default DefaultToast
