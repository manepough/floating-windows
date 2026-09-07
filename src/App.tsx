import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  StatusBar,
  Alert,
  Linking,
  Platform,
  PermissionsAndroid,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { NativeModules } from 'react-native';

const { FloatWindowModule } = NativeModules;

interface AppItem {
  id: string;
  name: string;
  packageName: string;
  color: string;
  initial: string;
}

const DEFAULT_APPS: AppItem[] = [
  {
    id: '1',
    name: 'Roblox',
    packageName: 'com.roblox.client',
    color: '#e74c3c',
    initial: 'R',
  },
  {
    id: '2',
    name: 'YouTube',
    packageName: 'com.google.android.youtube',
    color: '#ff0000',
    initial: 'Y',
  },
  {
    id: '3',
    name: 'WhatsApp',
    packageName: 'com.whatsapp',
    color: '#25d366',
    initial: 'W',
  },
  {
    id: '4',
    name: 'Facebook',
    packageName: 'com.facebook.katana',
    color: '#1877f2',
    initial: 'F',
  },
  {
    id: '5',
    name: 'TikTok',
    packageName: 'com.zhiliaoapp.musically',
    color: '#010101',
    initial: 'T',
  },
  {
    id: '6',
    name: 'Spotify',
    packageName: 'com.spotify.music',
    color: '#1db954',
    initial: 'S',
  },
  {
    id: '7',
    name: 'Discord',
    packageName: 'com.discord',
    color: '#5865f2',
    initial: 'D',
  },
  {
    id: '8',
    name: 'Telegram',
    packageName: 'org.telegram.messenger',
    color: '#0088cc',
    initial: 'TG',
  },
];

export default function App() {
  const [hasOverlayPermission, setHasOverlayPermission] = useState(false);
  const [activeFloats, setActiveFloats] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');
  const [apps, setApps] = useState<AppItem[]>(DEFAULT_APPS);

  useEffect(() => {
    checkOverlayPermission();
  }, []);

  const checkOverlayPermission = async () => {
    if (Platform.OS !== 'android') return;
    try {
      const granted = await FloatWindowModule?.checkOverlayPermission();
      setHasOverlayPermission(!!granted);
    } catch {
      setHasOverlayPermission(false);
    }
  };

  const requestOverlayPermission = () => {
    Linking.openSettings();
    Alert.alert(
      'Permission Required',
      'Enable "Display over other apps" for Float Launcher in Settings, then come back.',
      [{ text: 'OK', onPress: checkOverlayPermission }]
    );
  };

  const launchFloating = async (app: AppItem) => {
    if (!hasOverlayPermission) {
      Alert.alert(
        'Permission Needed',
        'Float Launcher needs permission to display over other apps.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Grant Permission', onPress: requestOverlayPermission },
        ]
      );
      return;
    }

    try {
      await FloatWindowModule?.launchFloating(app.packageName, app.name, app.color);
      setActiveFloats(prev =>
        prev.includes(app.id) ? prev : [...prev, app.id]
      );
    } catch (e: any) {
      if (e.message?.includes('not installed')) {
        Alert.alert(
          'App Not Installed',
          `${app.name} is not installed on your device.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Could not launch floating window.');
      }
    }
  };

  const closeFloating = async (app: AppItem) => {
    try {
      await FloatWindowModule?.closeFloating(app.packageName);
      setActiveFloats(prev => prev.filter(id => id !== app.id));
    } catch {}
  };

  const filtered = apps.filter(a =>
    a.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const renderApp = ({ item }: { item: AppItem }) => {
    const isActive = activeFloats.includes(item.id);
    return (
      <View style={styles.appCard}>
        <View style={[styles.appIcon, { backgroundColor: item.color }]}>
          <Text style={styles.appInitial}>{item.initial}</Text>
        </View>
        <View style={styles.appInfo}>
          <Text style={styles.appName}>{item.name}</Text>
          <Text style={styles.appPkg} numberOfLines={1}>{item.packageName}</Text>
        </View>
        <View style={styles.appActions}>
          {isActive ? (
            <TouchableOpacity
              style={[styles.actionBtn, styles.closeBtn]}
              onPress={() => closeFloating(item)}
            >
              <Text style={styles.actionBtnText}>Close</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionBtn, styles.floatBtn]}
              onPress={() => launchFloating(item)}
            >
              <Text style={styles.actionBtnText}>Float</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#0f0f0f" barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Float Launcher</Text>
        <Text style={styles.headerSub}>
          {activeFloats.length} floating
        </Text>
      </View>

      {!hasOverlayPermission && (
        <TouchableOpacity
          style={styles.permissionBanner}
          onPress={requestOverlayPermission}
        >
          <Text style={styles.permissionText}>
            Overlay permission needed — tap to enable
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search apps..."
          placeholderTextColor="#555"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderApp}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      {activeFloats.length > 0 && (
        <TouchableOpacity
          style={styles.closeAllBtn}
          onPress={async () => {
            for (const id of activeFloats) {
              const app = apps.find(a => a.id === id);
              if (app) await FloatWindowModule?.closeFloating(app.packageName);
            }
            setActiveFloats([]);
          }}
        >
          <Text style={styles.closeAllText}>Close All Floating Windows</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1e',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    color: '#666',
  },
  permissionBanner: {
    margin: 16,
    marginBottom: 0,
    backgroundColor: '#2a1a00',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ff9500',
  },
  permissionText: {
    color: '#ff9500',
    fontSize: 13,
    textAlign: 'center',
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  appCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#242424',
  },
  appIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appInitial: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  appInfo: {
    flex: 1,
    marginLeft: 14,
  },
  appName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  appPkg: {
    color: '#555',
    fontSize: 11,
    marginTop: 2,
  },
  appActions: {
    marginLeft: 10,
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  floatBtn: {
    backgroundColor: '#1e3a5f',
    borderWidth: 1,
    borderColor: '#2a5298',
  },
  closeBtn: {
    backgroundColor: '#3a1e1e',
    borderWidth: 1,
    borderColor: '#8b2020',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  closeAllBtn: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    backgroundColor: '#8b2020',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  closeAllText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
