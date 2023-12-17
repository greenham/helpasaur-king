import * as React from "react";
import { Toast } from "react-bootstrap";
import { IToast, IStreamAlertToast } from "../types/toasts";
import { useToast } from "../hooks/useToast";
import StreamCard from "./StreamCard";

export interface ToastVariant {
  icon: React.ReactNode;
  bgClass: string;
  title: string;
  textClass?: string;
}

export interface ToastVariants {
  [key: string]: ToastVariant;
}

const toastVariants: ToastVariants = {
  success: {
    icon: <i className="fa-regular fa-circle-check px-1"></i>,
    bgClass: "success",
    title: "Success!",
    textClass: "text-dark",
  },
  warning: {
    icon: <i className="fa-solid fa-triangle-exclamation px-1"></i>,
    bgClass: "warning",
    title: "Warning!",
    textClass: "text-body-emphasis",
  },
  info: {
    icon: <i className="fa-solid fa-circle-info px-1"></i>,
    bgClass: "info",
    title: "Info",
    textClass: "text-body-emphasis",
  },
  error: {
    icon: <i className="fa-solid fa-bug px-1"></i>,
    bgClass: "danger",
    title: "Error!",
    textClass: "text-body-emphasis",
  },
  streamAlert: {
    icon: <i className="fa-solid fa-broadcast-tower px-1"></i>,
    bgClass: "success",
    title: "Now live on Twitch!",
    textClass: "text-dark",
  },
};

const DefaultToast: React.FunctionComponent<IToast | IStreamAlertToast> = (
  props
) => {
  const { variant, title, message, id } = props;
  const toastVariant = toastVariants[variant];
  const [show, setShow] = React.useState(true);
  const toast = useToast();

  let toastBody = (
    <p className={`fs-5 ${toastVariant.textClass}`}>
      <strong>{message}</strong>
    </p>
  );

  if (variant === "streamAlert") {
    const streamAlert = props as IStreamAlertToast;
    toastBody = <StreamCard stream={streamAlert.stream} />;
  }

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
        <strong className="me-auto">{title ?? toastVariant.title}</strong>
      </Toast.Header>
      <Toast.Body>
        <p className={`fs-5 ${toastVariant.textClass}`}>
          <strong>{message}</strong>
        </p>
      </Toast.Body>
    </Toast>
  );
};

export default DefaultToast;
