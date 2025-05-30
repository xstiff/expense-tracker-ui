import {DarkTheme, DefaultTheme, ThemeProvider} from '@react-navigation/native';
import {useFonts} from 'expo-font';
import {Stack} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import 'react-native-reanimated';
import React, {useEffect} from 'react';

import {useColorScheme} from '@/hooks/useColorScheme';
import {OfflineManager} from '@/services/OfflineManager';
import OfflineBanner from '@/components/OfflineBanner';

export default function RootLayout() {
    const colorScheme = useColorScheme();
    const [loaded] = useFonts({
        SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    });

    useEffect(() => {
        const initializeApp = async () => {
            try {
                await OfflineManager.initialize();
            } catch (error) {
                console.error('Błąd podczas inicjalizacji:', error);
            }
        };

        initializeApp();
    }, []);

    if (!loaded) {
        return null;
    }

    return (
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <OfflineBanner />
            <Stack>
                <Stack.Screen name="(tabs)" options={{headerShown: false}}/>
                <Stack.Screen name="+not-found"/>
            </Stack>
            <StatusBar style="auto"/>
        </ThemeProvider>
    );
}

