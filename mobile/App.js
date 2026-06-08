import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.hero}>
        <Text style={styles.title}>Welcome to RideConnect</Text>
        <Text style={styles.subtitle}>
          Smart carpooling for Nairobi students and commuters
        </Text>
      </View>
      <View style={styles.features}>
        {[
          { icon: '🗺️', label: 'Intelligent Route Matching' },
          { icon: '📍', label: 'Real-time GPS Tracking' },
          { icon: '💳', label: 'M-Pesa Payments' },
          { icon: '⭐', label: 'Mutual Rating System' },
        ].map((f) => (
          <View key={f.label} style={styles.featureRow}>
            <Text style={styles.featureIcon}>{f.icon}</Text>
            <Text style={styles.featureLabel}>{f.label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.btnPrimary}>
          <Text style={styles.btnPrimaryText}>Find a Ride</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSecondary}>
          <Text style={styles.btnSecondaryText}>Offer a Ride</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f3460', alignItems: 'center', justifyContent: 'center' },
  hero: { alignItems: 'center', paddingHorizontal: 32, marginBottom: 40 },
  title: { fontSize: 28, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: 15, color: '#a0c4ff', textAlign: 'center', lineHeight: 22 },
  features: { width: '80%', marginBottom: 40 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  featureIcon: { fontSize: 20, marginRight: 12 },
  featureLabel: { color: '#e0e0e0', fontSize: 15 },
  actions: { width: '80%', gap: 12 },
  btnPrimary: {
    backgroundColor: '#fff', borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', marginBottom: 12,
  },
  btnPrimaryText: { color: '#0f3460', fontWeight: '700', fontSize: 16 },
  btnSecondary: {
    borderColor: '#fff', borderWidth: 2, borderRadius: 10,
    paddingVertical: 14, alignItems: 'center',
  },
  btnSecondaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
