import * as React from "react";
import ToastContainer from "react-bootstrap/ToastContainer";
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
      className="bg-dark position-relative"
      style={{
        position: "fixed",
        top: "80px",
        right: "20px",
      }}
    >
      <ToastContainer position="top-end" style={{ zIndex: 1 }}>
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
