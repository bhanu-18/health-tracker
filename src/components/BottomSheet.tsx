import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Heading } from './Typography';
import { colors, radius, spacing } from '../theme/tokens';

type Props = {
  visible: boolean;
  title: string;
  onDismiss: () => void;
  children: ReactNode;
  /** Pinned to the bottom, outside the scrolling area. */
  footer?: ReactNode;
};

/**
 * The app's bottom sheet.
 *
 * Shared rather than duplicated so the two sheets cannot drift apart -- they
 * already had: one grew and shrank with its content while the other did not,
 * so the search field moved down the screen as results narrowed and the header
 * landed in a different place every time.
 *
 * Three properties this guarantees:
 *
 *   - A CONSISTENT HEIGHT. `minHeight` stops the sheet collapsing around a
 *     short list, so the title and any search field stay put no matter how many
 *     results there are. A control that moves while you use it is the specific
 *     thing that made this feel unpredictable.
 *   - THE KEYBOARD NEVER COVERS THE INPUT. KeyboardAvoidingView shrinks the
 *     available space, and because the heights below are percentages of that
 *     space, the sheet shrinks with it rather than sliding off the top.
 *   - A SCROLLING MIDDLE, FIXED EDGES. Children flex into whatever is left, so
 *     the header and footer stay reachable at any content length.
 */
export function BottomSheet({ visible, title, onDismiss, children, footer }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.container}>
        <Pressable style={styles.backdrop} onPress={onDismiss} accessibilityLabel="Dismiss" />

        <KeyboardAvoidingView
          // 'padding' is correct on iOS; Android resizes the window itself and
          // applying it there double-counts the keyboard.
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.avoider}
        >
          <View style={styles.sheet}>
            <Heading style={styles.title}>{title}</Heading>

            <View style={styles.body}>{children}</View>

            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(28, 25, 23, 0.35)',
  },
  avoider: { justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    // The pair that fixes the reported problem: a floor so the sheet does not
    // shrink around short content, and a ceiling so it never covers the screen.
    minHeight: '62%',
    maxHeight: '88%',
  },
  title: { fontSize: 22, marginBottom: spacing.lg },
  // Takes the remaining height, so the footer stays pinned and the middle
  // scrolls rather than pushing the footer off the bottom.
  body: { flex: 1 },
  footer: { paddingTop: spacing.lg },
});
