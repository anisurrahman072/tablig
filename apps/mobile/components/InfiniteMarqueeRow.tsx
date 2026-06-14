import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  StyleSheet,
  View,
} from "react-native";

type Props = {
  children: React.ReactNode;
  /** Pixels per second */
  speed?: number;
  itemGap?: number;
};

export function InfiniteMarqueeRow({ children, speed = 28, itemGap = 8 }: Props) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [loopWidth, setLoopWidth] = useState(0);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  const firstSet = React.Children.toArray(children);
  const secondSet = firstSet.map((child, index) => {
    if (!React.isValidElement(child)) return child;
    return React.cloneElement(child, { key: `${child.key ?? index}-dup` });
  });

  function onMeasure(event: LayoutChangeEvent) {
    const width = event.nativeEvent.layout.width;
    const half = width / 2;
    if (half > 0 && Math.abs(half - loopWidth) > 1) {
      setLoopWidth(half);
    }
  }

  useEffect(() => {
    if (!loopWidth) return;

    animRef.current?.stop();
    translateX.setValue(0);

    const duration = Math.max(8000, (loopWidth / speed) * 1000);
    animRef.current = Animated.loop(
      Animated.timing(translateX, {
        toValue: -loopWidth,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animRef.current.start();

    return () => animRef.current?.stop();
  }, [loopWidth, speed, translateX]);

  return (
    <View style={styles.clip}>
      <Animated.View
        style={[
          styles.track,
          { transform: [{ translateX }] },
        ]}
        onLayout={onMeasure}
      >
        <View style={[styles.set, { gap: itemGap }]}>{firstSet}</View>
        <View style={[styles.set, { gap: itemGap }]}>{secondSet}</View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: "hidden",
  },
  track: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  set: {
    flexDirection: "row",
    alignItems: "stretch",
  },
});
