import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useGlobalSearchParams, usePathname, useRouter, useSegments } from 'expo-router';
import type { Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useFab } from '../context/FabContext';
import { shadows } from '../theme';

const FAB_SIZE = 60;
const FAB_MARGIN = 16;
const FAB_DRAG_BOTTOM_MARGIN = 8;
const DRAG_THRESHOLD = 8;

function buildCurrentHref(pathname: string, params: Record<string, string | string[] | undefined>): Href {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (entry) search.append(key, entry);
      });
    } else {
      search.set(key, value);
    }
  }
  const query = search.toString();
  return (query ? `${pathname}?${query}` : pathname) as Href;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function DraggableAddFab() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { token, loading } = useAuth();
  const { position, positionLoaded, setPosition, setReturnPath } = useFab();

  const bounds = useMemo(
    () => ({
      minX: 0,
      minY: FAB_MARGIN + insets.top,
      maxX: Math.max(0, width - FAB_SIZE),
      maxY: Math.max(
        FAB_MARGIN + insets.top,
        height - FAB_SIZE - FAB_DRAG_BOTTOM_MARGIN
      ),
    }),
    [width, height, insets.top]
  );

  const defaultPosition = useMemo(
    () => ({
      x: Math.max(0, width - FAB_SIZE - FAB_MARGIN),
      y: Math.min(
        height - FAB_SIZE - FAB_MARGIN - insets.bottom,
        bounds.maxY
      ),
    }),
    [bounds.maxY, height, insets.bottom, width]
  );

  const positionRef = useRef(defaultPosition);
  const dragStartRef = useRef(defaultPosition);
  const pan = useRef(new Animated.ValueXY(defaultPosition)).current;
  const dragActiveRef = useRef(false);

  useEffect(() => {
    if (!positionLoaded) return;

    const next = position
      ? {
          x: clamp(position.x, bounds.minX, bounds.maxX),
          y: clamp(position.y, bounds.minY, bounds.maxY),
        }
      : defaultPosition;

    positionRef.current = next;
    pan.setValue(next);
  }, [positionLoaded, position, bounds, defaultPosition, pan]);

  useEffect(() => {
    const clamped = {
      x: clamp(positionRef.current.x, bounds.minX, bounds.maxX),
      y: clamp(positionRef.current.y, bounds.minY, bounds.maxY),
    };
    if (
      clamped.x !== positionRef.current.x ||
      clamped.y !== positionRef.current.y
    ) {
      positionRef.current = clamped;
      pan.setValue(clamped);
      setPosition(clamped);
    }
  }, [bounds, pan, setPosition]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > DRAG_THRESHOLD || Math.abs(gesture.dy) > DRAG_THRESHOLD,
        onPanResponderGrant: () => {
          dragActiveRef.current = false;
          dragStartRef.current = { ...positionRef.current };
        },
        onPanResponderMove: (_, gesture) => {
          if (
            Math.abs(gesture.dx) > DRAG_THRESHOLD ||
            Math.abs(gesture.dy) > DRAG_THRESHOLD
          ) {
            dragActiveRef.current = true;
          }

          const next = {
            x: clamp(dragStartRef.current.x + gesture.dx, bounds.minX, bounds.maxX),
            y: clamp(dragStartRef.current.y + gesture.dy, bounds.minY, bounds.maxY),
          };
          pan.setValue(next);
        },
        onPanResponderRelease: (_, gesture) => {
          const next = {
            x: clamp(dragStartRef.current.x + gesture.dx, bounds.minX, bounds.maxX),
            y: clamp(dragStartRef.current.y + gesture.dy, bounds.minY, bounds.maxY),
          };

          positionRef.current = next;
          pan.setValue(next);
          setPosition(next);

          if (!dragActiveRef.current) {
            const returnHref = buildCurrentHref(pathname, params);
            setReturnPath(returnHref);
            router.push('/add-sathi?fromFab=1');
          }

          dragActiveRef.current = false;
        },
        onPanResponderTerminate: () => {
          dragActiveRef.current = false;
        },
      }),
    [bounds, pan, pathname, params, router, setPosition, setReturnPath]
  );

  const inAuth = segments[0] === '(auth)';
  const onAddScreen = pathname === '/add-sathi' || pathname === '/add-student';
  const visible = !loading && !!token && !inAuth && !onAddScreen;

  if (!visible || !positionLoaded) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.fabWrap,
          {
            transform: [{ translateX: pan.x }, { translateY: pan.y }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.glowRing}>
          <LinearGradient
            colors={['#FF8C42', '#E056A0', '#6C5CE7', '#2E86AB', '#48C9B0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabGradient}
          >
            <View style={styles.fabInner}>
              <Ionicons name="add" size={34} color="#FFFFFF" />
            </View>
          </LinearGradient>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
  },
  fabWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: FAB_SIZE,
    height: FAB_SIZE,
  },
  glowRing: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    padding: 2,
    backgroundColor: 'rgba(255,255,255,0.45)',
    ...shadows.card,
    shadowColor: '#A23B72',
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 12,
  },
  fabGradient: {
    flex: 1,
    borderRadius: FAB_SIZE / 2,
    padding: 2,
  },
  fabInner: {
    flex: 1,
    borderRadius: (FAB_SIZE - 4) / 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
