import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { showNotification } from '../../utils/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, Button } from '../../components/ui';
import { useRecordsStore } from '../../store/recordsStore';
import { useInspectionStore } from '../../store/inspectionStore';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import type { HomeStackParamList } from '../../navigation/MainNavigator';

type TemplateSelectRouteProp = RouteProp<HomeStackParamList, 'TemplateSelect'>;
type TemplateSelectNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'TemplateSelect'>;

interface Template {
  id: string;
  name: string;
  description: string | null;
}

export function TemplateSelectScreen() {
  const navigation = useNavigation<TemplateSelectNavigationProp>();
  const route = useRoute<TemplateSelectRouteProp>();
  const { siteId } = route.params; // siteId is now actually recordId

  const {
    currentRecord,
    recordTemplates,
    isLoading,
    error,
    fetchRecordById,
    fetchRecordTemplates,
  } = useRecordsStore();

  const { startInspection, isLoading: isStarting } = useInspectionStore();
  const { user, organisation } = useAuthStore();

  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  useEffect(() => {
    fetchRecordById(siteId);
    fetchRecordTemplates(siteId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
  };

  const handleStartInspection = async () => {
    if (!selectedTemplate || !user || !organisation) {
      showNotification('Error', 'Unable to start inspection. Please try again.');
      return;
    }

    const result = await startInspection(
      organisation.id,
      siteId,
      selectedTemplate,
      user.id
    );

    if (result.error) {
      showNotification('Error', result.error);
    } else if (result.reportId) {
      navigation.navigate('Inspection', { reportId: result.reportId });
    }
  };

  const renderTemplate = ({ item }: { item: Template }) => {
    const isSelected = selectedTemplate === item.id;

    return (
      <TouchableOpacity
        onPress={() => handleTemplateSelect(item.id)}
        activeOpacity={0.7}
      >
        <Card
          style={StyleSheet.flatten([
            styles.templateCard,
            isSelected ? styles.templateCardSelected : undefined,
          ])}
        >
          <View style={styles.radioContainer}>
            <View
              style={[
                styles.radioOuter,
                isSelected && styles.radioOuterSelected,
              ]}
            >
              {isSelected && <View style={styles.radioInner} />}
            </View>
          </View>
          <View style={styles.templateInfo}>
            <Text style={styles.templateName}>{item.name}</Text>
            {item.description && (
              <Text style={styles.templateDescription} numberOfLines={2}>
                {item.description}
              </Text>
            )}
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No Templates</Text>
      <Text style={styles.emptyText}>
        No inspection templates are available. Contact your administrator to
        create and publish templates.
      </Text>
    </View>
  );

  if (isLoading && !currentRecord) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.recordName}>{currentRecord?.name || 'Record'}</Text>
        <Text style={styles.headerTitle}>Select Template</Text>
        <Text style={styles.headerSubtitle}>
          Choose an inspection template to use
        </Text>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={recordTemplates}
          keyExtractor={(item) => item.id}
          renderItem={renderTemplate}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={!isLoading ? renderEmpty : null}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => fetchRecordTemplates(siteId)}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {recordTemplates.length > 0 && (
        <View style={styles.footer}>
          <Button
            title="Start Inspection"
            onPress={handleStartInspection}
            disabled={!selectedTemplate}
            loading={isStarting}
            fullWidth
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  recordName: {
    fontSize: fontSize.caption,
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  headerTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: 0,
    flexGrow: 1,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
  },
  templateCardSelected: {
    borderColor: colors.primary.DEFAULT,
    borderWidth: 2,
  },
  radioContainer: {
    marginRight: spacing.md,
    paddingTop: 2,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: colors.primary.DEFAULT,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary.DEFAULT,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
  templateDescription: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  separator: {
    height: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: fontSize.body,
    color: colors.danger,
    textAlign: 'center',
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
});
