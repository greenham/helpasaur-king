import * as React from "react";
import Toast from "react-bootstrap/Toast";

export interface DefaultToastProps {
  variant?: string;
  message?: string;
}

export interface ToastVariant {
  icon: React.ReactNode;
  bgClass: string;
}

export interface ToastVariants {
  [key: string]: ToastVariant;
}

const toastVariants: ToastVariants = {
  success: {
    icon: <i className="fa-regular fa-circle-check"></i>,
    bgClass: "success",
  },
  warning: {
    icon: <i className="fa-solid fa-triangle-exclamation"></i>,
    bgClass: "warning",
  },
  info: {
    icon: <i className="fa-solid fa-circle-info"></i>,
    bgClass: "info",
  },
  error: {
    icon: <i className="fa-solid fa-exclamation"></i>,
    bgClass: "error",
  },
};

const DefaultToast: React.FunctionComponent<DefaultToastProps> = (props) => {
  const { variant, message } = props;
  const toastVariant = toastVariants[variant || "info"];
  return (
    <Toast>
      <Toast.Header>
        {toastVariant.icon}
        <strong className="me-auto">{toastVariant.bgClass}</strong>
      </Toast.Header>
      <Toast.Body>{message}</Toast.Body>
    </Toast>
  );
};

export default DefaultToast;
