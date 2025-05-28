import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, Alert } from 'react-native';

import { API } from '@/api/api';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

enum AuthMode {
  LOGIN = 'login',
  SIGNUP = 'signup',
  PROFILE = 'profile'
}

export default function AccountScreen() {
  const [email, setEmail] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode>(AuthMode.LOGIN);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await API.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        setAuthMode(AuthMode.PROFILE);
      } else {
        setAuthMode(AuthMode.LOGIN);
      }
    } catch (error) {
      setAuthMode(AuthMode.LOGIN);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!loginUsername || !password) {
      Alert.alert('Błąd', 'Wypełnij wszystkie pola');
      return;
    }

    try {
      setLoading(true);
      const response = await API.login({ username: loginUsername, password });
      if (response && response.access_token) {
        checkAuth();
        Alert.alert('Sukces', 'Zalogowano pomyślnie');
        resetForm();
      }
    } catch (error) {
      console.error('Błąd logowania:', error);
      Alert.alert('Błąd', 'Nieprawidłowy login lub hasło');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword || !username) {
      Alert.alert('Błąd', 'Wypełnij wszystkie pola');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Błąd', 'Hasła nie są identyczne');
      return;
    }

    try {
      setLoading(true);
      await API.signup({
        user_base: {
          username,
          email,
          full_name: username, // Używamy username jako full_name, jeśli nie mamy osobnego pola
          disabled: false
        },
        password
      });
      Alert.alert('Sukces', 'Konto zostało utworzone. Możesz się teraz zalogować.');
      setAuthMode(AuthMode.LOGIN);
      resetForm();
    } catch (error) {
      console.error('Błąd rejestracji:', error);
      Alert.alert('Błąd', 'Nie udało się utworzyć konta. Spróbuj ponownie.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await API.logout();
      setUser(null);
      setAuthMode(AuthMode.LOGIN);
      resetForm();
    } catch (error) {
      console.error('Błąd wylogowania:', error);
      Alert.alert('Błąd', 'Nie udało się wylogować');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setLoginUsername('');
    setPassword('');
    setConfirmPassword('');
    setUsername('');
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  return (
    <ScrollView style={styles.scrollContainer}>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>
          {authMode === AuthMode.LOGIN ? 'Logowanie' :
           authMode === AuthMode.SIGNUP ? 'Rejestracja' : 'Twój profil'}
        </ThemedText>

        {authMode === AuthMode.PROFILE ? (
          <ThemedView style={styles.profileContainer}>
            <ThemedText type="subtitle">Witaj, {user?.username || 'Użytkowniku'}!</ThemedText>
            <ThemedText style={styles.emailText}>{user?.email}</ThemedText>

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              disabled={loading}
            >
              <ThemedText style={styles.buttonText}>Wyloguj się</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        ) : (
          <ThemedView style={styles.formContainer}>
            {authMode === AuthMode.SIGNUP && (
              <ThemedView style={styles.inputContainer}>
                <ThemedText>Nazwa użytkownika</ThemedText>
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Nazwa użytkownika"
                  autoCapitalize="none"
                />
              </ThemedView>
            )}

            {authMode === AuthMode.SIGNUP && (
              <ThemedView style={styles.inputContainer}>
                <ThemedText>Email</ThemedText>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </ThemedView>
            )}

            {authMode === AuthMode.LOGIN && (
              <ThemedView style={styles.inputContainer}>
                <ThemedText>Login</ThemedText>
                <TextInput
                  style={styles.input}
                  value={loginUsername}
                  onChangeText={setLoginUsername}
                  placeholder="Login"
                  autoCapitalize="none"
                />
              </ThemedView>
            )}

            <ThemedView style={styles.inputContainer}>
              <ThemedText>Hasło</ThemedText>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Hasło"
                secureTextEntry
              />
            </ThemedView>

            {authMode === AuthMode.SIGNUP && (
              <ThemedView style={styles.inputContainer}>
                <ThemedText>Potwierdź hasło</ThemedText>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Potwierdź hasło"
                  secureTextEntry
                />
              </ThemedView>
            )}

            <TouchableOpacity
              style={styles.authButton}
              onPress={authMode === AuthMode.LOGIN ? handleLogin : handleSignup}
              disabled={loading}
            >
              <ThemedText style={styles.buttonText}>
                {authMode === AuthMode.LOGIN ? 'Zaloguj się' : 'Zarejestruj się'}
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => setAuthMode(authMode === AuthMode.LOGIN ? AuthMode.SIGNUP : AuthMode.LOGIN)}
            >
              <ThemedText style={styles.switchButtonText}>
                {authMode === AuthMode.LOGIN ? 'Nie masz konta? Zarejestruj się' : 'Masz już konto? Zaloguj się'}
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        )}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginVertical: 30,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    backgroundColor: '#fff',
    width: '100%',
  },
  authButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  switchButton: {
    marginTop: 16,
    alignItems: 'center',
    padding: 10,
  },
  switchButtonText: {
    textDecorationLine: 'underline',
  },
  profileContainer: {
    width: '100%',
    alignItems: 'center',
  },
  emailText: {
    marginVertical: 8,
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    width: '60%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
