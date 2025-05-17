import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import theme from '../constants/theme';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Expense Tracker</Text>
          <Text style={styles.subtitle}>Welcome back!</Text>
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <Text style={styles.balanceAmount}>$0.00</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No transactions yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Your recent transactions will appear here
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: theme.spacing.lg,
  },
  header: {
    marginBottom: theme.spacing['2xl'],
  },
  title: {
    fontSize: theme.typography.sizes['2xl'],
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.black,
  },
  subtitle: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.gray[500],
    marginTop: theme.spacing.xs,
  },
  balanceCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing['2xl'],
    ...theme.shadows.md,
  },
  balanceLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.gray[100],
    marginBottom: theme.spacing.xs,
  },
  balanceAmount: {
    fontSize: theme.typography.sizes['3xl'],
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.white,
  },
  section: {
    marginBottom: theme.spacing['2xl'],
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.black,
    marginBottom: theme.spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing['2xl'],
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  emptyStateText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.gray[900],
    marginBottom: theme.spacing.xs,
  },
  emptyStateSubtext: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.gray[500],
    textAlign: 'center',
  },
}); 