import * as React from "react"
import { ToastContainer } from "react-bootstrap"
import DefaultToast from "./DefaultToast"
import { IToast } from "../types/toasts"

interface DefaultToastContainerProps {
  toasts: IToast[]
}

const DefaultToastContainer: React.FunctionComponent<
  DefaultToastContainerProps
> = (props) => {
  const { toasts } = props
  return (
    <ToastContainer position="bottom-start" className="position-fixed p-3">
      {toasts &&
        toasts.map((toast) => (
          <DefaultToast
            key={toast.id}
            id={toast.id}
            variant={toast.variant}
            message={toast.message}
          />
        ))}
    </ToastContainer>
  )
}

export default DefaultToastContainer
