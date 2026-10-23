import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import {
  Manrope_400Regular,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useReducedMotion } from 'react-native-reanimated';

import { AuthProvider } from '@/lib/auth';
import { colors, fonts } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    DMSerifDisplay_400Regular,
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  const reduced = useReducedMotion();

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            // tranziții native de platformă; cu Reduce motion → fade
            animation: reduced ? 'fade' : 'default',
            contentStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.navy,
            headerTitleStyle: { fontFamily: fonts.bold },
            headerBackButtonDisplayMode: 'minimal',
            headerShadowVisible: false,
            headerStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="cabinet/[id]"
            options={{ title: '', headerTransparent: true, headerTintColor: '#FFFFFF', headerStyle: undefined }}
          />
          <Stack.Screen name="programare/[cabinetId]" options={{ title: 'Programare' }} />
          <Stack.Screen
            name="programare/confirmare"
            options={{ title: 'Confirmare', headerBackVisible: false, gestureEnabled: false }}
          />
          <Stack.Screen name="auth/login" options={{ title: 'Intră în cont', presentation: 'modal' }} />
        </Stack>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
