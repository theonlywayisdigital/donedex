import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput as RNTextInput,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input } from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, fontSize, fontWeight } from '../../constants/theme';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

export function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpInputRefs = useRef<(RNTextInput | null)[]>([]);

  const { signInStep1, signInStep2, resendOTP, cancelOTP, isLoading, pendingOTPEmail } = useAuthStore();

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Focus first OTP input when showing OTP screen
  useEffect(() => {
    if (showOTPInput && otpInputRefs.current[0]) {
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    }
  }, [showOTPInput]);

  const handleLogin = async () => {
    console.log('[LoginScreen] handleLogin called');
    setError(null);

    // Basic validation
    if (!email.trim()) {
      console.log('[LoginScreen] No email provided');
      setError('Please enter your email address');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      console.log('[LoginScreen] Invalid email format');
      setError('Please enter a valid email address');
      return;
    }
    if (!password) {
      console.log('[LoginScreen] No password provided');
      setError('Please enter your password');
      return;
    }

    console.log('[LoginScreen] Calling signInStep1 with email:', email.trim());
    const result = await signInStep1(email.trim(), password);
    console.log('[LoginScreen] signInStep1 result:', result);

    if (result.error) {
      setError(result.error);
    } else if (result.requiresOTP) {
      console.log('[LoginScreen] OTP required, showing OTP input');
      setShowOTPInput(true);
      setResendCooldown(60); // Start 60 second cooldown
    }
  };

  const handleOTPChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/[^0-9]/g, '').slice(-1);

    const newOtp = [...otpCode];
    newOtp[index] = digit;
    setOtpCode(newOtp);

    // Auto-focus next input
    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (digit && index === 5) {
      const fullCode = newOtp.join('');
      if (fullCode.length === 6) {
        handleVerifyOTP(fullCode);
      }
    }
  };

  const handleOTPKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async (code?: string) => {
    setError(null);
    const fullCode = code || otpCode.join('');

    if (fullCode.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    const result = await signInStep2(fullCode);

    if (result.error) {
      setError(result.error);
      setOtpCode(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;

    setError(null);
    const result = await resendOTP();

    if (result.error) {
      setError(result.error);
    } else {
      setResendCooldown(60);
      setOtpCode(['', '', '', '', '', '']);
    }
  };

  const handleBackToLogin = () => {
    cancelOTP();
    setShowOTPInput(false);
    setOtpCode(['', '', '', '', '', '']);
    setError(null);
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const handleSignUp = () => {
    navigation.navigate('SignUp');
  };

  // OTP Verification Screen
  if (showOTPInput) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <Image
                source={require('../../../assets/donedex-logo.png')}
                style={styles.logoSmall}
                resizeMode="contain"
              />
              <Text style={styles.title}>Enter verification code</Text>
              <Text style={styles.subtitle}>
                {`We've sent a 6-digit code to\n${pendingOTPEmail || email}`}
              </Text>
            </View>

            <View style={styles.form}>
              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <View style={styles.otpContainer}>
                {otpCode.map((digit, index) => (
                  <RNTextInput
                    key={index}
                    ref={(ref) => { otpInputRefs.current[index] = ref; }}
                    style={[
                      styles.otpInput,
                      digit ? styles.otpInputFilled : null,
                    ]}
                    value={digit}
                    onChangeText={(value) => handleOTPChange(index, value)}
                    onKeyPress={({ nativeEvent }) => handleOTPKeyPress(index, nativeEvent.key)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    autoComplete="one-time-code"
                  />
                ))}
              </View>

              <Button
                title="Verify Code"
                onPress={() => handleVerifyOTP()}
                loading={isLoading}
                fullWidth
              />

              <View style={styles.resendContainer}>
                {resendCooldown > 0 ? (
                  <Text style={styles.resendText}>
                    {`Resend code in ${resendCooldown}s`}
                  </Text>
                ) : (
                  <TouchableOpacity onPress={handleResendOTP}>
                    <Text style={styles.resendLink}>Resend code</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={styles.backButton}
                onPress={handleBackToLogin}
              >
                <Text style={styles.backButtonText}>Back to login</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Login Screen
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Image
              source={require('../../../assets/donedex-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.subtitle}>Sign in to continue</Text>
          </View>

          <View style={styles.form}>
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Input
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
            />

            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
            />

            <TouchableOpacity
              onPress={handleForgotPassword}
              style={styles.forgotPassword}
            >
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>

            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={isLoading}
              fullWidth
            />

            <View style={styles.signUpContainer}>
              <Text style={styles.signUpText}>Don't have an account? </Text>
              <TouchableOpacity onPress={handleSignUp}>
                <Text style={styles.signUpLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: -spacing.lg,
    marginTop: -spacing.xl,
  },
  logoSmall: {
    width: 120,
    height: 120,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSize.caption,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: spacing.lg,
    marginTop: -spacing.sm,
  },
  forgotPasswordText: {
    color: colors.primary.DEFAULT,
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  signUpText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
  signUpLink: {
    fontSize: fontSize.body,
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.bold,
  },
  // OTP styles
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: colors.border.DEFAULT,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
    color: colors.text.primary,
    backgroundColor: colors.white,
  },
  otpInputFilled: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary.light,
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  resendText: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  resendLink: {
    fontSize: fontSize.caption,
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.bold,
  },
  backButton: {
    alignItems: 'center',
    marginTop: spacing.lg,
    padding: spacing.sm,
  },
  backButtonText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
});
