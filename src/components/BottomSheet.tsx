import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Heading } from './Typography';
import { radius, spacing } from '../theme/tokens';
import type { Theme } from '../theme/tokens';
import { useThemedStyles } from '../theme/useTheme';

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
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      {/* Top inset keeps the sheet clear of the status bar and notch. Without
          it, a tall sheet plus an open keyboard runs the title under the
          clock. */}
      <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
        <Pressable style={styles.backdrop} onPress={onDismiss} accessibilityLabel="Dismiss" />

        <KeyboardAvoidingView
          // 'padding' is correct on iOS; Android resizes the window itself and
          // applying it there double-counts the keyboard.
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          // flex: 1 is load-bearing. Without it this view sizes to its content,
          // the percentage heights below resolve against an unsized parent, and
          // the sheet grows past the top of the screen.
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

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: { flex: 1, justifyContent: 'flex-end' },
    backdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(28, 25, 23, 0.35)',
    },
    avoider: { flex: 1, justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: t.colors.background,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xl,
      paddingBottom: spacing.xl,
      // A floor so the sheet does not shrink around short content, and a ceiling
      // so it never fills the space it has been given. Both are percentages of
      // the keyboard-adjusted area above, so they shrink together when the
      // keyboard opens rather than overflowing.
      minHeight: '55%',
      maxHeight: '100%',
    },
    title: { fontSize: 22, marginBottom: spacing.lg },
    // Takes the remaining height, so the footer stays pinned and the middle
    // scrolls rather than pushing the footer off the bottom.
    body: { flex: 1 },
    footer: { paddingTop: spacing.lg },
  });
