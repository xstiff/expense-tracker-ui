import {DarkTheme, DefaultTheme, ThemeProvider} from '@react-navigation/native';
import {useFonts} from 'expo-font';
import {Stack} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import 'react-native-reanimated';
import React, {useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {useColorScheme} from '@/hooks/useColorScheme';
import {OfflineManager} from '@/services/OfflineManager';

const OFFLINE_SIMULATOR_KEY = 'offline_simulator_enabled';

export default function RootLayout() {
    const colorScheme = useColorScheme();
    const [loaded] = useFonts({
        SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    });

    useEffect(() => {
        const initializeApp = async () => {
            try {
                await OfflineManager.initialize();

                const savedState = await AsyncStorage.getItem(OFFLINE_SIMULATOR_KEY);
                if (savedState !== null) {
                    const state = JSON.parse(savedState);
                }
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
            <Stack>
                <Stack.Screen name="(tabs)" options={{headerShown: false}}/>
                <Stack.Screen name="+not-found"/>
            </Stack>
            <StatusBar style="auto"/>
        </ThemeProvider>
    );
}


