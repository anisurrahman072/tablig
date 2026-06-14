import { Alert } from 'react-native';
import type { AppAlertButton } from '../components/AppAlertModal';

type ShowAlertFn = (title: string, message?: string, buttons?: AppAlertButton[]) => void;

let showAlertImpl: ShowAlertFn | null = null;

export function registerAppAlert(fn: ShowAlertFn | null) {
  showAlertImpl = fn;
}

export function appAlert(title: string, message?: string, buttons?: AppAlertButton[]) {
  if (showAlertImpl) {
    showAlertImpl(title, message, buttons);
    return;
  }
  Alert.alert(title, message, buttons);
}
