import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { LogIn, LogOut, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { useAuth } from '@/lib/auth';
import { getProfil, stergeContul, updateProfil } from '@/lib/data';
import { eroareText } from '@/lib/format';
import { useAsync } from '@/lib/hooks';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/lib/theme';

export default function Cont() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const userId = session?.user.id;
  const { data: profil, loading } = useAsync(
    () => (userId ? getProfil(userId) : Promise.resolve(null)),
    [userId],
  );

  const [nume, setNume] = useState('');
  const [telefon, setTelefon] = useState('');
  const [salvez, setSalvez] = useState(false);
  const [salvat, setSalvat] = useState(false);
  const [sterg, setSterg] = useState(false);

  // valorile salvate; formularul se reinițializează când sosește profilul
  const [baza, setBaza] = useState({ nume: '', telefon: '' });
  const [profilVazut, setProfilVazut] = useState(profil);
  if (profilVazut !== profil) {
    setProfilVazut(profil);
    const b = { nume: profil?.nume ?? '', telefon: profil?.telefon ?? '' };
    setBaza(b);
    setNume(b.nume);
    setTelefon(b.telefon);
  }

  const modificat = baza.nume !== nume || baza.telefon !== telefon;

  const salveaza = async () => {
    if (!userId) return;
    setSalvez(true);
    try {
      await updateProfil(userId, { nume: nume.trim() || null, telefon: telefon.trim() || null });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setBaza({ nume, telefon });
      setSalvat(true);
    } catch (e) {
      Alert.alert('Nu s-a putut salva', eroareText(e));
    } finally {
      setSalvez(false);
    }
  };

  // Confirmare dublă, apoi rpc('sterge_contul_meu') și logout
  const confirmaStergerea = () => {
    Alert.alert(
      'Ștergi contul?',
      'Se șterg contul, profilul și toate programările tale. Acțiunea nu poate fi anulată.',
      [
        { text: 'Renunță', style: 'cancel' },
        {
          text: 'Continuă',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Ești sigur?', 'Ultima confirmare: contul se șterge definitiv.', [
              { text: 'Renunță', style: 'cancel' },
              {
                text: 'Șterge definitiv',
                style: 'destructive',
                onPress: async () => {
                  setSterg(true);
                  try {
                    await stergeContul();
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.navigate('/');
                  } catch (e) {
                    Alert.alert('Nu s-a putut șterge contul', eroareText(e));
                  } finally {
                    setSterg(false);
                  }
                },
              },
            ]),
        },
      ],
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 40, gap: 20 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text variant="title">Cont</Text>

      {!session ? (
        <EmptyState
          icon={<LogIn size={36} color={colors.accent} />}
          title="Nu ești autentificat"
          text="Poți căuta și vedea profiluri fără cont. Pentru programări, intră în cont."
          action={<Button title="Intră în cont" onPress={() => router.push('/auth/login')} />}
        />
      ) : loading ? (
        <Skeleton height={240} radius={radius.card} />
      ) : (
        <>
          <View style={s.card}>
            <View style={s.who}>
              <Avatar nume={nume || session.user.email || '?'} size={56} />
              <View style={{ flex: 1 }}>
                <Text variant="h3" numberOfLines={1}>
                  {nume || 'Fără nume'}
                </Text>
                <Text variant="small" numberOfLines={1}>
                  {session.user.email}
                </Text>
              </View>
            </View>

            <Field label="Nume">
              <TextInput
                value={nume}
                onChangeText={(v) => {
                  setNume(v);
                  setSalvat(false);
                }}
                placeholder="Numele tău"
                placeholderTextColor={colors.muted}
                style={s.input}
                autoComplete="name"
                textContentType="name"
              />
            </Field>
            <Field label="Telefon">
              <TextInput
                value={telefon}
                onChangeText={(v) => {
                  setTelefon(v);
                  setSalvat(false);
                }}
                placeholder="+40 7xx xxx xxx"
                placeholderTextColor={colors.muted}
                style={s.input}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
              />
            </Field>
            <Button
              title={salvat && !modificat ? 'Salvat' : 'Salvează'}
              onPress={salveaza}
              loading={salvez}
              disabled={!modificat}
            />
          </View>

          <Button
            title="Ieși din cont"
            variant="outline"
            icon={<LogOut size={18} color={colors.text} />}
            onPress={() => supabase.auth.signOut()}
          />
          <Button
            title="Șterge contul"
            variant="danger"
            icon={<Trash2 size={18} color={colors.danger} />}
            loading={sterg}
            onPress={confirmaStergerea}
          />
        </>
      )}
    </ScrollView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text variant="label">{label}</Text>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 16,
  },
  who: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  input: {
    minHeight: 50,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    paddingHorizontal: 14,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
  },
});
