import * as React from "react";
import Toast from "react-bootstrap/Toast";
import { IToast } from "../types/toasts";

export interface ToastVariant {
  icon: React.ReactNode;
  bgClass: string;
  title: string;
}

export interface ToastVariants {
  [key: string]: ToastVariant;
}

const toastVariants: ToastVariants = {
  success: {
    icon: <i className="fa-regular fa-circle-check px-1"></i>,
    bgClass: "success",
    title: "Success!",
  },
  warning: {
    icon: <i className="fa-solid fa-triangle-exclamation px-1"></i>,
    bgClass: "warning",
    title: "Warning!",
  },
  info: {
    icon: <i className="fa-solid fa-circle-info px-1"></i>,
    bgClass: "info",
    title: "Info",
  },
  error: {
    icon: <i className="fa-solid fa-exclamation px-1"></i>,
    bgClass: "error",
    title: "Error!",
  },
};

const DefaultToast: React.FunctionComponent<IToast> = (props) => {
  const { variant, message } = props;
  const toastVariant = toastVariants[variant];
  const [show, setShow] = React.useState(true);
  return (
    <Toast
      bg={toastVariant.bgClass}
      onClose={() => setShow(false)}
      show={show}
      delay={3000}
      autohide
    >
      <Toast.Header>
        {toastVariant.icon}
        <strong className="me-auto">{toastVariant.title}</strong>
      </Toast.Header>
      <Toast.Body>{message}</Toast.Body>
    </Toast>
  );
};

export default DefaultToast;
