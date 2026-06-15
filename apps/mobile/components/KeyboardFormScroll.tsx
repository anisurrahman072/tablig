import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  Dimensions,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { spacing } from '../theme';

type Props = {
  children: React.ReactNode;
  contentContainerStyle?: ViewStyle;
  refreshControl?: React.ReactElement;
};

type ScrollIntoViewFn = (fieldRef: React.RefObject<View | null>) => void;

const ScrollFocusContext = createContext<ScrollIntoViewFn | null>(null);

/** Scrolls a field into view only when it would sit under the keyboard. */
export function useScrollOnInputFocus(): ScrollIntoViewFn | null {
  return useContext(ScrollFocusContext);
}

export const KeyboardFormScroll = forwardRef<ScrollView, Props>(function KeyboardFormScroll(
  { children, contentContainerStyle, refreshControl },
  ref,
) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useImperativeHandle(ref, () => scrollRef.current as ScrollView);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const scrollFieldIntoView = useCallback<ScrollIntoViewFn>((fieldRef) => {
    const scrollView = scrollRef.current;
    const field = fieldRef.current;
    if (!scrollView || !field) return;

    const delay = Platform.OS === 'android' ? 300 : 100;
    setTimeout(() => {
      field.measureInWindow((_fx, fieldTop, _fw, fieldHeight) => {
        const kbHeight = Keyboard.metrics()?.height ?? 0;
        const visibleBottom = Dimensions.get('window').height - kbHeight;
        const gap = spacing.lg;
        const fieldBottom = fieldTop + fieldHeight;

        if (fieldBottom > visibleBottom - gap) {
          scrollView.scrollTo({
            y: scrollY.current + (fieldBottom - visibleBottom) + gap,
            animated: true,
          });
        }
      });
    }, delay);
  }, []);

  // Edge-to-edge Android ignores adjustResize — add scroll room when keyboard is open.
  const androidKeyboardPadding = Platform.OS === 'android' ? keyboardHeight : 0;

  return (
    <ScrollFocusContext.Provider value={scrollFieldIntoView}>
      <View style={styles.flex}>
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={[
            contentContainerStyle,
            { paddingBottom: spacing.lg + androidKeyboardPadding },
          ]}
          refreshControl={refreshControl}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          showsVerticalScrollIndicator={false}
          onScroll={(e) => {
            scrollY.current = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
        >
          {children}
        </ScrollView>
      </View>
    </ScrollFocusContext.Provider>
  );
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
