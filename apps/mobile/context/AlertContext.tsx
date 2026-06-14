import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  AppAlertButton,
  AppAlertModal,
  inferTypeFromAlert,
} from '../components/AppAlertModal';
import { registerAppAlert } from '../lib/appAlert';

type AlertState = {
  visible: boolean;
  title: string;
  message?: string;
  buttons: AppAlertButton[];
  type: ReturnType<typeof inferTypeFromAlert>;
};

const AlertContext = createContext<(title: string, message?: string, buttons?: AppAlertButton[]) => void>(
  () => {}
);

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AlertState>({
    visible: false,
    title: '',
    message: undefined,
    buttons: [],
    type: 'info',
  });

  const dismiss = useCallback(() => {
    setState((prev) => ({ ...prev, visible: false }));
  }, []);

  const showAlert = useCallback(
    (title: string, message?: string, buttons: AppAlertButton[] = []) => {
      setState({
        visible: true,
        title,
        message,
        buttons,
        type: inferTypeFromAlert(title, buttons),
      });
    },
    []
  );

  useEffect(() => {
    registerAppAlert(showAlert);
    return () => registerAppAlert(null);
  }, [showAlert]);

  return (
    <AlertContext.Provider value={showAlert}>
      {children}
      <AppAlertModal
        visible={state.visible}
        title={state.title}
        message={state.message}
        type={state.type}
        buttons={state.buttons}
        onDismiss={dismiss}
      />
    </AlertContext.Provider>
  );
}

export function useAppAlert() {
  return useContext(AlertContext);
}
