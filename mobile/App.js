import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { RoleProvider } from './src/context/RoleContext';
import { PhotoProvider } from './src/context/PhotoContext';
import { SchoolProvider } from './src/context/SchoolContext';
import { AppDataProvider } from './src/context/AppDataContext';
import { LessonsProvider } from './src/context/LessonsContext';
import RootNavigator from './src/navigation/RootNavigator';
import LandingScreen from './src/screens/LandingScreen';
import LoadingScreen from './src/screens/LoadingScreen';
import MinistryReviewScreen from './src/screens/MinistryReviewScreen';
import { initializeAppData } from './src/services/appDataRepository';

function NavWrapper() {
  const { c, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  // seed/migrate the ONE canonical store once on first launch (Phase 1/2 final)
  useEffect(() => { initializeAppData(); }, []);
  const [entered, setEntered] = useState(false);   // passed the landing page
  const [ministry, setMinistry] = useState(false); // ministry review portal (code-gated)
  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme : DefaultTheme).colors,
      background: c.bg,
      card: c.surface,
      text: c.ink,
      border: c.line,
      primary: c.blue,
    },
  };

  // 1) splash/loading screen (web kob-loader port)
  if (loading) {
    return (
      <>
        <StatusBar style="light" />
        <LoadingScreen onDone={() => setLoading(false)} />
      </>
    );
  }

  // 1b) ministry review portal — reached from the landing, gated by a code
  if (ministry) {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <MinistryReviewScreen onBack={() => setMinistry(false)} />
      </>
    );
  }

  // 2) marketing landing page; its CTAs enter the app directly
  if (!entered) {
    return (
      <>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <LandingScreen onEnter={() => setEntered(true)} onMinistry={() => setMinistry(true)} />
      </>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RoleProvider>
          <PhotoProvider>
            <SchoolProvider>
              <AppDataProvider>
                <LessonsProvider>
                  <NavWrapper />
                </LessonsProvider>
              </AppDataProvider>
            </SchoolProvider>
          </PhotoProvider>
        </RoleProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
