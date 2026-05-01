interface ToastProps {
  text: string;
  visible: boolean;
}

export function Toast({ text, visible }: ToastProps) {
  return <div className={`milestone-toast${visible ? ' show' : ''}`}>{text}</div>;
}
