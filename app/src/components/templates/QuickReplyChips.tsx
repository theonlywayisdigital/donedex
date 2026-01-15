import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Keyboard,
} from 'react-native';
import { Send } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight, components } from '../../constants/theme';

interface QuickReplyChipsProps {
  options?: string[];
  onSelect: (option: string) => void;
  disabled?: boolean;
}

export function QuickReplyChips({ options = [], onSelect, disabled = false }: QuickReplyChipsProps) {
  const [inputText, setInputText] = useState('');

  const handleSend = () => {
    if (inputText.trim() && !disabled) {
      onSelect(inputText.trim());
      setInputText('');
      Keyboard.dismiss();
    }
  };

  return (
    <View style={styles.container}>
      {/* Text input - always visible */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type your message..."
          placeholderTextColor={colors.text.tertiary}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          editable={!disabled}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!inputText.trim() || disabled) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || disabled}
        >
          <Send size={20} color={inputText.trim() && !disabled ? colors.white : colors.neutral[500]} />
        </TouchableOpacity>
      </View>

      {/* Quick suggestions - optional shortcuts */}
      {options.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsLabel}>Suggestions:</Text>
          <View style={styles.chipsContainer}>
            {options.slice(0, 4).map((option, index) => (
              <TouchableOpacity
                key={`${option}-${index}`}
                style={[styles.chip, disabled && styles.chipDisabled]}
                onPress={() => !disabled && onSelect(option)}
                disabled={disabled}
              >
                <Text style={[styles.chipText, disabled && styles.chipTextDisabled]} numberOfLines={1}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSize.body,
    color: colors.text.primary,
    minHeight: 44,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.full,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.neutral[200],
  },
  suggestionsContainer: {
    marginTop: spacing.sm,
  },
  suggestionsLabel: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipText: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  chipTextDisabled: {
    color: colors.neutral[500],
  },
});
