import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { colors, fontSize } from '../constants/theme';
import { Icon } from '../components/ui';
import {
  DashboardScreen,
  SiteListScreen as HomeSiteListScreen,
  TemplateSelectScreen,
  RecordTypeSelectScreen,
  RecordSearchScreen,
  QuickCreateRecordScreen,
  RecordDetailScreen,
  TemplatePickerScreen,
  RecordForTemplateScreen,
} from '../screens/home';
import {
  InspectionScreen,
  InspectionReviewScreen,
  InspectionCompleteScreen,
} from '../screens/inspection';
import { TemplateListScreen, TemplateDetailScreen, TemplateEditorScreen, NewTemplateScreen, AITemplateBuilderScreen } from '../screens/templates';
import {
  SiteListScreen as AdminSiteListScreen,
  SiteEditorScreen,
  SiteAssignTemplatesScreen,
  RecordTypesListScreen,
  RecordsListScreen,
  AddRecordTypeScreen,
  RecordTypeEditorScreen,
} from '../screens/sites';
import { ReportListScreen, ReportDetailScreen } from '../screens/reports';
import { TeamListScreen, InviteUserScreen } from '../screens/team';
import {
  SettingsScreen,
  ProfileScreen,
  ChangePasswordScreen,
  BillingScreen,
  OrganisationSettingsScreen,
  BrandingSettingsScreen,
  AboutScreen,
} from '../screens/settings';

// Placeholder screens - will be replaced with real screens
function PlaceholderScreen({ title }: { title: string }) {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>{title}</Text>
      <Text style={styles.placeholderSubtext}>Coming soon</Text>
    </View>
  );
}

// Home Stack
export type HomeStackParamList = {
  Dashboard: undefined;
  // Legacy route - kept for backwards compatibility
  SiteList: undefined;
  // Record-first flow
  RecordTypeSelect: undefined;
  RecordSearch: { recordTypeId: string; mode?: 'select' | 'view' };
  QuickCreateRecord: { recordTypeId: string };
  // Template-first flow (NEW)
  TemplatePicker: undefined;
  RecordForTemplate: { templateId: string; templateName: string; recordTypeId?: string };
  // Existing inspection flow
  TemplateSelect: { siteId: string };
  Inspection: { reportId: string };
  InspectionReview: { reportId: string };
  InspectionComplete: { reportId: string };
  // Record detail (for browse mode)
  RecordDetail: { recordId: string };
};

const HomeStack = createNativeStackNavigator<HomeStackParamList>();

function HomeNavigator() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ headerShown: false }}
      />
      {/* Legacy route - kept for backwards compatibility */}
      <HomeStack.Screen
        name="SiteList"
        component={HomeSiteListScreen}
        options={{ title: 'Select Record' }}
      />
      {/* NEW: Start inspection flow */}
      <HomeStack.Screen
        name="RecordTypeSelect"
        component={RecordTypeSelectScreen}
        options={{ title: 'Start Inspection' }}
      />
      <HomeStack.Screen
        name="RecordSearch"
        component={RecordSearchScreen}
        options={{ title: 'Select Record' }}
      />
      <HomeStack.Screen
        name="QuickCreateRecord"
        component={QuickCreateRecordScreen}
        options={{ title: 'New Record' }}
      />
      <HomeStack.Screen
        name="TemplateSelect"
        component={TemplateSelectScreen}
        options={{ title: 'Select Template' }}
      />
      {/* Template-first flow (NEW) */}
      <HomeStack.Screen
        name="TemplatePicker"
        component={TemplatePickerScreen}
        options={{ title: 'Choose Template' }}
      />
      <HomeStack.Screen
        name="RecordForTemplate"
        component={RecordForTemplateScreen}
        options={{ title: 'Select Record' }}
      />
      <HomeStack.Screen
        name="Inspection"
        component={InspectionScreen}
        options={{ title: 'Inspection' }}
      />
      <HomeStack.Screen
        name="InspectionReview"
        component={InspectionReviewScreen}
        options={{ title: 'Review' }}
      />
      <HomeStack.Screen
        name="InspectionComplete"
        component={InspectionCompleteScreen}
        options={{ headerShown: false }}
      />
      <HomeStack.Screen
        name="RecordDetail"
        component={RecordDetailScreen}
        options={{ title: 'Record' }}
      />
    </HomeStack.Navigator>
  );
}

// Reports Stack
export type ReportsStackParamList = {
  ReportList: undefined;
  ReportDetail: { reportId: string };
};

const ReportsStack = createNativeStackNavigator<ReportsStackParamList>();

function ReportsNavigator() {
  return (
    <ReportsStack.Navigator>
      <ReportsStack.Screen
        name="ReportList"
        component={ReportListScreen}
        options={{ title: 'Reports' }}
      />
      <ReportsStack.Screen
        name="ReportDetail"
        component={ReportDetailScreen}
        options={{ title: 'Report' }}
      />
    </ReportsStack.Navigator>
  );
}

// Templates Stack (Admin only)
export type TemplatesStackParamList = {
  TemplateList: undefined;
  TemplateDetail: { templateId: string };
  NewTemplate: undefined;
  TemplateEditor: { templateId?: string; initialData?: {
    name: string;
    description: string;
    sections: {
      name: string;
      sort_order: number;
      items: {
        label: string;
        item_type: string;
        is_required: boolean;
        photo_rule: 'never' | 'on_fail' | 'always';
        options?: string[] | null;
      }[];
    }[];
  }};
  TemplateImport: undefined;
  TemplateAssign: { templateId: string };
  AITemplateBuilder: undefined;
};

const TemplatesStack = createNativeStackNavigator<TemplatesStackParamList>();

function TemplatesNavigator() {
  return (
    <TemplatesStack.Navigator>
      <TemplatesStack.Screen
        name="TemplateList"
        component={TemplateListScreen}
        options={{ title: 'Templates' }}
      />
      <TemplatesStack.Screen
        name="TemplateDetail"
        component={TemplateDetailScreen}
        options={{ title: 'Template' }}
      />
      <TemplatesStack.Screen
        name="NewTemplate"
        component={NewTemplateScreen}
        options={{ title: 'New Template' }}
      />
      <TemplatesStack.Screen
        name="TemplateEditor"
        component={TemplateEditorScreen}
        options={({ route }) => ({
          title: route.params?.templateId ? 'Edit Template' : 'New Template',
        })}
      />
      <TemplatesStack.Screen
        name="AITemplateBuilder"
        component={AITemplateBuilderScreen}
        options={{ headerShown: false }}
      />
    </TemplatesStack.Navigator>
  );
}

// Records Stack (Admin only) - formerly Sites
export type SitesStackParamList = {
  RecordTypesList: undefined;
  RecordsList: { recordTypeId: string };
  SiteList: undefined;
  SiteEditor: { siteId?: string; recordTypeId?: string };
  SiteAssignTemplates: { siteId: string };
  AddRecordType: undefined;
  RecordTypeEditor: { recordTypeId: string };
  RecordDetail: { recordId: string };
};

const SitesStack = createNativeStackNavigator<SitesStackParamList>();

function SitesNavigator() {
  return (
    <SitesStack.Navigator>
      <SitesStack.Screen
        name="RecordTypesList"
        component={RecordTypesListScreen}
        options={{ title: 'Records' }}
      />
      <SitesStack.Screen
        name="RecordsList"
        component={RecordsListScreen}
        options={{ title: 'Records' }}
      />
      <SitesStack.Screen
        name="SiteList"
        component={AdminSiteListScreen}
        options={{ title: 'All Records' }}
      />
      <SitesStack.Screen
        name="SiteEditor"
        component={SiteEditorScreen}
        options={({ route }) => ({
          title: route.params?.siteId ? 'Edit Record' : 'New Record',
        })}
      />
      <SitesStack.Screen
        name="SiteAssignTemplates"
        component={SiteAssignTemplatesScreen}
        options={{ title: 'Assign Templates' }}
      />
      <SitesStack.Screen
        name="AddRecordType"
        component={AddRecordTypeScreen}
        options={{ title: 'Add Record Type' }}
      />
      <SitesStack.Screen
        name="RecordTypeEditor"
        component={RecordTypeEditorScreen}
        options={{ title: 'Edit Record Type' }}
      />
      <SitesStack.Screen
        name="RecordDetail"
        component={RecordDetailScreen}
        options={{ title: 'Record' }}
      />
    </SitesStack.Navigator>
  );
}

// Team Stack (Admin only)
export type TeamStackParamList = {
  TeamList: undefined;
  InviteUser: undefined;
  UserDetail: { userId: string };
};

const TeamStack = createNativeStackNavigator<TeamStackParamList>();

function TeamNavigator() {
  return (
    <TeamStack.Navigator>
      <TeamStack.Screen
        name="TeamList"
        component={TeamListScreen}
        options={{ title: 'Team' }}
      />
      <TeamStack.Screen
        name="InviteUser"
        component={InviteUserScreen}
        options={{ title: 'Invite Team Member' }}
      />
    </TeamStack.Navigator>
  );
}

// Settings Stack
export type SettingsStackParamList = {
  Settings: undefined;
  Profile: undefined;
  ChangePassword: undefined;
  Billing: undefined;
  OrganisationSettings: undefined;
  BrandingSettings: undefined;
  About: undefined;
};

const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();

function SettingsNavigator() {
  return (
    <SettingsStack.Navigator
      screenOptions={{
        headerShown: true,
        headerTintColor: colors.primary.DEFAULT,
        headerStyle: {
          backgroundColor: colors.white,
        },
        headerTitleStyle: {
          color: colors.text.primary,
          fontWeight: '600',
        },
      }}
    >
      <SettingsStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings', headerBackVisible: false }}
      />
      <SettingsStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <SettingsStack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ title: 'Change Password' }}
      />
      <SettingsStack.Screen
        name="Billing"
        component={BillingScreen}
        options={{ title: 'Billing & Subscription' }}
      />
      <SettingsStack.Screen
        name="OrganisationSettings"
        component={OrganisationSettingsScreen}
        options={{ title: 'Organisation' }}
      />
      <SettingsStack.Screen
        name="BrandingSettings"
        component={BrandingSettingsScreen}
        options={{ title: 'Branding' }}
      />
      <SettingsStack.Screen
        name="About"
        component={AboutScreen}
        options={{ title: 'About' }}
      />
    </SettingsStack.Navigator>
  );
}

// Main Tab Navigator
export type MainTabParamList = {
  HomeTab: undefined;
  ReportsTab: undefined;
  TemplatesTab: undefined;
  SitesTab: undefined;
  TeamTab: undefined;
  SettingsTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainNavigator() {
  const role = useAuthStore((state) => state.role);
  const isAdmin = role === 'admin' || role === 'owner';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary.DEFAULT,
        tabBarInactiveTintColor: colors.neutral[500],
        tabBarLabelStyle: {
          fontSize: 12,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeNavigator}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Icon name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ReportsTab"
        component={ReportsNavigator}
        options={{
          tabBarLabel: 'Reports',
          tabBarIcon: ({ color, size }) => (
            <Icon name="file-text" size={size} color={color} />
          ),
        }}
      />
      {isAdmin && (
        <>
          <Tab.Screen
            name="TemplatesTab"
            component={TemplatesNavigator}
            options={{
              tabBarLabel: 'Templates',
              tabBarIcon: ({ color, size }) => (
                <Icon name="layout-template" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="SitesTab"
            component={SitesNavigator}
            options={{
              tabBarLabel: 'Records',
              tabBarIcon: ({ color, size }) => (
                <Icon name="folder" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="TeamTab"
            component={TeamNavigator}
            options={{
              tabBarLabel: 'Team',
              tabBarIcon: ({ color, size }) => (
                <Icon name="users" size={size} color={color} />
              ),
            }}
          />
        </>
      )}
      <Tab.Screen
        name="SettingsTab"
        component={SettingsNavigator}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Icon name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  placeholderText: {
    fontSize: fontSize.pageTitle,
    color: colors.text.primary,
    fontWeight: '600',
  },
  placeholderSubtext: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    marginTop: 8,
  },
});
