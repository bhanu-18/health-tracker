import type { ReactNode } from 'react';
import { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RectButton, Swipeable } from 'react-native-gesture-handler';
import { fontSize, radius, spacing } from '../theme/tokens';
import type { Theme } from '../theme/tokens';
import { useThemedStyles } from '../theme/useTheme';

type Props = {
  children: ReactNode;
  onDelete: () => void;
  /** Shown in the accessibility action, e.g. "Remove Basmati rice". */
  label: string;
};

/**
 * Swipe left to reveal a delete action.
 *
 * Replaces a long press, which had two problems: nothing on screen said the
 * gesture existed, and a long press has no intermediate state -- you either did
 * nothing or triggered a confirm dialog. A swipe announces itself as you make
 * it, and abandoning it halfway simply springs back.
 *
 * The revealed button is what deletes, so the gesture alone never destroys
 * anything: the swipe exposes the choice, the tap makes it.
 */
export function SwipeToDelete({ children, onDelete, label }: Props) {
  const styles = useThemedStyles(makeStyles);
  const swipeRef = useRef<Swipeable>(null);

  const renderRightActions = () => (
    <RectButton
      style={styles.action}
      onPress={() => {
        // Close first, so the row is not left open behind a re-render.
        swipeRef.current?.close();
        onDelete();
      }}
    >
      <Text style={styles.actionText}>Remove</Text>
    </RectButton>
  );

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      // Enough resistance that a horizontal flick while scrolling the list does
      // not open a delete action by accident.
      friction={2}
      rightThreshold={40}
      overshootRight={false}
    >
      <View
        accessible
        accessibilityLabel={label}
        accessibilityHint="Swipe left to remove"
        // Screen readers cannot perform a swipe, so the same action is exposed
        // directly rather than being reachable by gesture alone.
        accessibilityActions={[{ name: 'magicTap', label: 'Remove' }]}
        onAccessibilityAction={onDelete}
      >
        {children}
      </View>
    </Swipeable>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    action: {
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: t.colors.danger,
      width: 96,
      borderRadius: radius.md,
      marginBottom: spacing.sm,
    },
    actionText: {
      color: t.colors.primaryText,
      fontSize: fontSize.body,
      fontWeight: '600',
    },
  });
