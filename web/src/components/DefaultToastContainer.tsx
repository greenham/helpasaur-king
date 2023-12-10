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
      style={{ minHeight: "240px" }}
    >
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 1 }}>
        {toasts.map((toast) => (
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
