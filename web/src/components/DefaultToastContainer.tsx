import * as React from "react";
import { ToastContainer } from "react-bootstrap";
import DefaultToast from "./DefaultToast";
import { IToast } from "../types/toasts";

interface DefaultToastContainerProps {
  toasts: IToast[];
}

const DefaultToastContainer: React.FunctionComponent<
  DefaultToastContainerProps
> = (props) => {
  const { toasts } = props;
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="position-relative"
      style={{
        position: "fixed",
        top: "80px",
        right: "40px",
        zIndex: 1,
      }}
    >
      <ToastContainer position="top-end">
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
    </div>
  );
};

export default DefaultToastContainer;
