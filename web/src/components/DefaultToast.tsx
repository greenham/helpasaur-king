import * as React from "react";
import { Toast } from "react-bootstrap";
import { IToast } from "../types/toasts";
import { useToast } from "../hooks/useToast";

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
    icon: <i className="fa-solid fa-bug px-1"></i>,
    bgClass: "danger",
    title: "Error!",
  },
};

const DefaultToast: React.FunctionComponent<IToast> = (props) => {
  const { variant, message, id } = props;
  const toastVariant = toastVariants[variant];
  const [show, setShow] = React.useState(true);
  const toast = useToast();
  return (
    <Toast
      bg={toastVariant.bgClass}
      onClose={() => {
        setShow(false);
      }}
      onExited={() => {
        toast.remove(id);
      }}
      show={show}
      delay={5000}
      autohide
    >
      <Toast.Header>
        {toastVariant.icon}
        <strong className="me-auto">{toastVariant.title}</strong>
      </Toast.Header>
      <Toast.Body className="text-dark">
        <strong>{message}</strong>
      </Toast.Body>
    </Toast>
  );
};

export default DefaultToast;
