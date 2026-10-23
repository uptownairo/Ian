import * as AppleAuthentication from 'expo-apple-authentication';
import { makeRedirectUri } from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Mail } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { useAuth } from '@/lib/auth';
import { updateProfil } from '@/lib/data';
import { eroareText } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/lib/theme';

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [cod, setCod] = useState('');
  const [pas, setPas] = useState<'email' | 'cod'>('email');
  const [busy, setBusy] = useState<null | 'email' | 'cod' | 'google' | 'apple'>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [appleOk, setAppleOk] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'ios') AppleAuthentication.isAvailableAsync().then(setAppleOk);
  }, []);

  // odată autentificat, închidem ecranul și revenim unde era utilizatorul
  useEffect(() => {
    if (session) router.back();
  }, [session]);

  const trimiteCod = async () => {
    setBusy('email');
    setMesaj(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setPas('cod');
    } catch (e) {
      setMesaj(eroareText(e));
    } finally {
      setBusy(null);
    }
  };

  const verificaCod = async () => {
    setBusy('cod');
    setMesaj(null);
    try {
      const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: cod.trim(), type: 'email' });
      if (error) throw error;
    } catch (e) {
      setMesaj(eroareText(e));
    } finally {
      setBusy(null);
    }
  };

  const google = async () => {
    setBusy('google');
    setMesaj(null);
    try {
      const redirectTo = makeRedirectUri();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) throw error;
      const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (res.type !== 'success') return;
      const code = new URL(res.url).searchParams.get('code');
      if (!code) throw new Error('Autentificarea Google nu a returnat un cod.');
      const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
      if (exErr) throw exErr;
    } catch (e) {
      setMesaj(eroareText(e));
    } finally {
      setBusy(null);
    }
  };

  // Sign in with Apple (obligatoriu pe iOS când există login cu Google)
  const apple = async () => {
    setBusy('apple');
    setMesaj(null);
    try {
      const rawNonce = Crypto.randomUUID();
      const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashed,
      });
      if (!cred.identityToken) throw new Error('Apple nu a returnat un token.');
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: cred.identityToken,
        nonce: rawNonce,
      });
      if (error) throw error;
      // Apple trimite numele doar la prima autentificare
      const nume = [cred.fullName?.givenName, cred.fullName?.familyName].filter(Boolean).join(' ');
      if (nume && data.user) await updateProfil(data.user.id, { nume }).catch(() => {});
    } catch (e) {
      if (e && typeof e === 'object' && 'code' in e && e.code === 'ERR_REQUEST_CANCELED') return;
      setMesaj(eroareText(e));
    } finally {
      setBusy(null);
    }
  };

  const emailValid = /^\S+@\S+\.\S+$/.test(email.trim());

  return (
    <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
      <View style={{ gap: 8 }}>
        <Text variant="title">Intră în cont</Text>
        <Text variant="body" style={{ color: colors.muted }}>
          Contul îți trebuie doar pentru programări. Căutarea și profilurile merg și fără cont.
        </Text>
      </View>

      {pas === 'email' ? (
        <View style={{ gap: 10 }}>
          <Text variant="label">Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="nume@exemplu.ro"
            placeholderTextColor={colors.muted}
            style={s.input}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="send"
            onSubmitEditing={() => emailValid && trimiteCod()}
          />
          <Button
            title="Trimite codul pe email"
            icon={<Mail size={18} color="#FFFFFF" />}
            onPress={trimiteCod}
            loading={busy === 'email'}
            disabled={!emailValid || !!busy}
          />
        </View>
      ) : (
        <Animated.View entering={FadeIn.duration(200)} style={{ gap: 10 }}>
          <Text variant="label">Codul din email</Text>
          <Text variant="small">
            Am trimis un cod la {email.trim()}. Poți folosi și linkul din email.
          </Text>
          <TextInput
            value={cod}
            onChangeText={(v) => setCod(v.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456"
            placeholderTextColor={colors.muted}
            style={[s.input, s.code]}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            autoFocus
          />
          <Button
            title="Confirmă"
            onPress={verificaCod}
            loading={busy === 'cod'}
            disabled={cod.length < 6 || !!busy}
          />
          <Button title="Schimbă emailul" variant="outline" onPress={() => setPas('email')} />
        </Animated.View>
      )}

      <View style={s.or}>
        <View style={s.line} />
        <Text variant="small">sau</Text>
        <View style={s.line} />
      </View>

      <View style={{ gap: 10 }}>
        {appleOk && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={radius.button}
            style={{ height: 52 }}
            onPress={apple}
          />
        )}
        <Button title="Continuă cu Google" variant="outline" onPress={google} loading={busy === 'google'} />
      </View>

      {mesaj && (
        <Animated.View entering={FadeIn.duration(180)} style={s.error} accessibilityLiveRegion="polite">
          <Text style={s.errorText}>{mesaj}</Text>
        </Animated.View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 20, gap: 24, paddingBottom: 48 },
  input: {
    minHeight: 52,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.text,
  },
  code: { fontFamily: fonts.bold, fontSize: 24, letterSpacing: 8, textAlign: 'center' },
  or: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  error: { backgroundColor: colors.dangerBg, borderRadius: 12, padding: 12 },
  errorText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.danger },
});
