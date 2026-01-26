/**
 * AdaptiveNavigator - Switches between desktop sidebar and mobile bottom tabs
 * Desktop web: Sidebar navigation with flat stack
 * Mobile/Tablet/Native: Bottom tab navigation (existing MainNavigator)
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, Text, Pressable } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigationState, useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { useBillingStore } from '../store/billingStore';
import { useResponsive } from '../hooks/useResponsive';
import { Sidebar, type SidebarSection } from '../components/layout';
import { MainNavigator } from './MainNavigator';
import { SuperAdminNavigator } from './SuperAdminNavigator';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';
import { Icon } from '../components/ui';

// Import all screens for desktop flat navigation
import {
  DashboardScreen,
  SiteListScreen as HomeSiteListScreen,
  TemplateSelectScreen,
  RecordTypeSelectScreen,
  RecordSearchScreen,
  QuickCreateRecordScreen,
  RecordDetailScreen,
} from '../screens/home';
import {
  InspectionScreen,
  InspectionReviewScreen,
  InspectionCompleteScreen,
} from '../screens/inspection';
import { TemplateListScreen, TemplateDetailScreen, TemplateEditorScreen, NewTemplateScreen, AITemplateBuilderScreen, TemplatePreviewScreen, DocumentImportScreen } from '../screens/templates';
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
  SuperAdminDashboardScreen,
  OrganisationsListScreen,
  OrganisationDetailScreen,
  CreateOrganisationScreen,
  UsersListScreen,
  UserDetailScreen,
  AuditLogsScreen,
  SuperAdminTeamScreen,
  SendNotificationScreen,
  NotificationHistoryScreen,
} from '../screens/superadmin';
import {
  SettingsScreen,
  ProfileScreen,
  ChangePasswordScreen,
  BillingScreen,
  OrganisationSettingsScreen,
  BrandingSettingsScreen,
  AboutScreen,
} from '../screens/settings';

// Desktop Stack param list - all screens in flat hierarchy
export type DesktopStackParamList = {
  // Home/Dashboard
  Dashboard: undefined;
  HomeSiteList: undefined;
  // NEW: Start inspection flow
  RecordTypeSelect: undefined;
  RecordSearch: { recordTypeId: string; mode?: 'select' | 'view' };
  QuickCreateRecord: { recordTypeId: string };
  RecordDetail: { recordId: string };
  // Existing inspection flow
  TemplateSelect: { siteId: string };
  Inspection: { reportId: string };
  InspectionReview: { reportId: string };
  InspectionComplete: { reportId: string };
  // Reports
  ReportList: undefined;
  ReportDetail: { reportId: string };
  // Templates
  TemplateList: undefined;
  TemplateDetail: { templateId: string };
  TemplatePreview: { templateId: string };
  NewTemplate: undefined;
  TemplateEditor: { templateId?: string; initialData?: unknown };
  AITemplateBuilder: undefined;
  DocumentImport: undefined;
  // Records/Sites
  RecordTypesList: undefined;
  RecordsList: { recordTypeId: string };
  SiteList: undefined;
  SiteEditor: { siteId?: string; recordTypeId?: string };
  SiteAssignTemplates: { siteId: string };
  AddRecordType: undefined;
  RecordTypeEditor: { recordTypeId: string };
  // Team
  TeamList: undefined;
  InviteUser: undefined;
  // Settings
  Settings: undefined;
  Profile: undefined;
  ChangePassword: undefined;
  Billing: undefined;
  OrganisationSettings: undefined;
  BrandingSettings: undefined;
  About: undefined;
  // Super Admin
  SuperAdminDashboard: undefined;
  OrganisationsList: undefined;
  OrganisationDetail: { orgId: string };
  CreateOrganisation: undefined;
  UsersList: undefined;
  UserDetail: { userId: string };
  AuditLogs: undefined;
  SuperAdminTeam: undefined;
  NotificationHistory: undefined;
  SendNotification: undefined;
};

const DesktopStack = createNativeStackNavigator<DesktopStackParamList>();

// Map route names to sidebar keys for active state
const ROUTE_TO_SIDEBAR_KEY: Record<string, string> = {
  Dashboard: 'dashboard',
  HomeSiteList: 'start',
  // NEW: Start inspection flow screens
  RecordTypeSelect: 'start',
  RecordSearch: 'start',
  QuickCreateRecord: 'start',
  RecordDetail: 'start',
  // Existing inspection flow
  TemplateSelect: 'start',
  Inspection: 'start',
  InspectionReview: 'start',
  InspectionComplete: 'start',
  ReportList: 'reports',
  ReportDetail: 'reports',
  TemplateList: 'templates',
  TemplateDetail: 'templates',
  TemplatePreview: 'templates',
  NewTemplate: 'templates',
  TemplateEditor: 'templates',
  AITemplateBuilder: 'templates',
  DocumentImport: 'templates',
  RecordTypesList: 'records',
  RecordsList: 'records',
  SiteList: 'records',
  SiteEditor: 'records',
  SiteAssignTemplates: 'records',
  AddRecordType: 'records',
  RecordTypeEditor: 'records',
  TeamList: 'team',
  InviteUser: 'team',
  Settings: 'settings',
  Profile: 'settings',
  ChangePassword: 'settings',
  Billing: 'settings',
  OrganisationSettings: 'settings',
  BrandingSettings: 'settings',
  About: 'settings',
  // Super Admin routes
  SuperAdminDashboard: 'dashboard',
  OrganisationsList: 'organisations',
  OrganisationDetail: 'organisations',
  CreateOrganisation: 'organisations',
  UsersList: 'users',
  UserDetail: 'users',
  AuditLogs: 'audit',
  SuperAdminTeam: 'team',
  NotificationHistory: 'notifications',
  SendNotification: 'notifications',
};

// Web-specific styles
const webStyles: Record<string, React.CSSProperties> = Platform.OS === 'web' ? {
  container: {
    minHeight: '100vh',
  },
  content: {
    minHeight: '100vh',
    overflowY: 'auto' as const,
  },
  desktopContainer: {
    minHeight: '100vh',
  },
  desktopContentWrapper: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9', // Slightly darker bg to show content area
    minHeight: '100vh',
  },
  desktopContent: {
    width: '100%',
    maxWidth: 1400,
    minHeight: '100vh',
    overflowY: 'auto' as const,
  },
} : {};

// Custom header left button for desktop web
function DesktopBackButton() {
  const navigation = useNavigation<any>();
  const canGoBack = navigation.canGoBack();

  if (!canGoBack) return null;

  return (
    <Pressable
      onPress={() => navigation.goBack()}
      style={({ pressed }) => [
        desktopHeaderStyles.backButton,
        pressed && desktopHeaderStyles.backButtonPressed,
      ]}
    >
      <Icon name="arrow-left" size={20} color={colors.primary.DEFAULT} />
    </Pressable>
  );
}

const desktopHeaderStyles = StyleSheet.create({
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginLeft: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  backButtonPressed: {
    backgroundColor: colors.primary.light,
  },
});

// Screens that should show a header with back button on desktop web
// NOTE: Do NOT include screens that render their own custom headers (e.g., AITemplateBuilder, DocumentImport)
const SCREENS_WITH_BACK_BUTTON = new Set([
  'RecordSearch',
  'QuickCreateRecord',
  'RecordDetail',
  'TemplateSelect',
  'Inspection',
  'InspectionReview',
  'InspectionComplete',
  'ReportDetail',
  'TemplateDetail',
  'TemplatePreview',
  'NewTemplate',
  'TemplateEditor',
  // AITemplateBuilder and DocumentImport have their own custom headers
  'RecordsList',
  'SiteEditor',
  'SiteAssignTemplates',
  'AddRecordType',
  'RecordTypeEditor',
  'InviteUser',
  'Profile',
  'ChangePassword',
  'Billing',
  'OrganisationSettings',
  'BrandingSettings',
  'About',
  'OrganisationDetail',
  'CreateOrganisation',
  'UserDetail',
  'SendNotification',
]);

// Screen titles for desktop header
const SCREEN_TITLES: Record<string, string> = {
  RecordSearch: 'Select Record',
  QuickCreateRecord: 'New Record',
  RecordDetail: 'Record Details',
  TemplateSelect: 'Select Template',
  Inspection: 'Inspection',
  InspectionReview: 'Review',
  InspectionComplete: 'Complete',
  ReportDetail: 'Report',
  TemplateDetail: 'Template Details',
  TemplatePreview: 'Template Preview',
  NewTemplate: 'New Template',
  TemplateEditor: 'Edit Template',
  // AITemplateBuilder and DocumentImport have their own headers
  RecordsList: 'Records',
  SiteEditor: 'Edit Record',
  SiteAssignTemplates: 'Assign Templates',
  AddRecordType: 'New Record Type',
  RecordTypeEditor: 'Edit Record Type',
  InviteUser: 'Invite User',
  Profile: 'Profile',
  ChangePassword: 'Change Password',
  Billing: 'Billing',
  OrganisationSettings: 'Organisation Settings',
  BrandingSettings: 'Branding',
  About: 'About',
  OrganisationDetail: 'Organisation',
  CreateOrganisation: 'New Organisation',
  UserDetail: 'User Details',
  SendNotification: 'Send Notification',
};

/**
 * Desktop Stack Navigator - flat hierarchy for web
 */
function DesktopStackNavigator() {
  return (
    <DesktopStack.Navigator
      screenOptions={({ route }) => {
        const showHeader = SCREENS_WITH_BACK_BUTTON.has(route.name);
        return {
          headerShown: showHeader,
          headerTitle: SCREEN_TITLES[route.name] || route.name,
          headerLeft: showHeader ? () => <DesktopBackButton /> : undefined,
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTitleStyle: {
            fontSize: fontSize.sectionTitle,
            fontWeight: fontWeight.semibold,
            color: colors.text.primary,
          },
          headerShadowVisible: true,
        };
      }}
    >
      {/* Dashboard / Home */}
      <DesktopStack.Screen name="Dashboard" component={DashboardScreen} />
      <DesktopStack.Screen name="HomeSiteList" component={HomeSiteListScreen} />
      {/* NEW: Start inspection flow */}
      <DesktopStack.Screen name="RecordTypeSelect" component={RecordTypeSelectScreen} />
      <DesktopStack.Screen name="RecordSearch" component={RecordSearchScreen} />
      <DesktopStack.Screen name="QuickCreateRecord" component={QuickCreateRecordScreen} />
      <DesktopStack.Screen name="RecordDetail" component={RecordDetailScreen} />
      {/* Existing inspection flow */}
      <DesktopStack.Screen name="TemplateSelect" component={TemplateSelectScreen} />
      <DesktopStack.Screen name="Inspection" component={InspectionScreen} />
      <DesktopStack.Screen name="InspectionReview" component={InspectionReviewScreen} />
      <DesktopStack.Screen name="InspectionComplete" component={InspectionCompleteScreen} />

      {/* Reports */}
      <DesktopStack.Screen name="ReportList" component={ReportListScreen} />
      <DesktopStack.Screen name="ReportDetail" component={ReportDetailScreen} />

      {/* Templates */}
      <DesktopStack.Screen name="TemplateList" component={TemplateListScreen} />
      <DesktopStack.Screen name="TemplateDetail" component={TemplateDetailScreen} />
      <DesktopStack.Screen name="TemplatePreview" component={TemplatePreviewScreen} />
      <DesktopStack.Screen name="NewTemplate" component={NewTemplateScreen} />
      <DesktopStack.Screen name="TemplateEditor" component={TemplateEditorScreen} />
      <DesktopStack.Screen name="AITemplateBuilder" component={AITemplateBuilderScreen} />
      <DesktopStack.Screen name="DocumentImport" component={DocumentImportScreen} />

      {/* Records / Sites */}
      <DesktopStack.Screen name="RecordTypesList" component={RecordTypesListScreen} />
      <DesktopStack.Screen name="RecordsList" component={RecordsListScreen} />
      <DesktopStack.Screen name="SiteList" component={AdminSiteListScreen} />
      <DesktopStack.Screen name="SiteEditor" component={SiteEditorScreen} />
      <DesktopStack.Screen name="SiteAssignTemplates" component={SiteAssignTemplatesScreen} />
      <DesktopStack.Screen name="AddRecordType" component={AddRecordTypeScreen} />
      <DesktopStack.Screen name="RecordTypeEditor" component={RecordTypeEditorScreen} />

      {/* Team */}
      <DesktopStack.Screen name="TeamList" component={TeamListScreen} />
      <DesktopStack.Screen name="InviteUser" component={InviteUserScreen} />

      {/* Settings */}
      <DesktopStack.Screen name="Settings" component={SettingsScreen} />
      <DesktopStack.Screen name="Profile" component={ProfileScreen} />
      <DesktopStack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <DesktopStack.Screen name="Billing" component={BillingScreen} />
      <DesktopStack.Screen name="OrganisationSettings" component={OrganisationSettingsScreen} />
      <DesktopStack.Screen name="BrandingSettings" component={BrandingSettingsScreen} />
      <DesktopStack.Screen name="About" component={AboutScreen} />

      {/* Super Admin */}
      <DesktopStack.Screen name="SuperAdminDashboard" component={SuperAdminDashboardScreen} />
      <DesktopStack.Screen name="OrganisationsList" component={OrganisationsListScreen} />
      <DesktopStack.Screen name="OrganisationDetail" component={OrganisationDetailScreen} />
      <DesktopStack.Screen name="CreateOrganisation" component={CreateOrganisationScreen} />
      <DesktopStack.Screen name="UsersList" component={UsersListScreen} />
      <DesktopStack.Screen name="UserDetail" component={UserDetailScreen} />
      <DesktopStack.Screen name="AuditLogs" component={AuditLogsScreen} />
      <DesktopStack.Screen name="SuperAdminTeam" component={SuperAdminTeamScreen} />
      <DesktopStack.Screen name="NotificationHistory" component={NotificationHistoryScreen} />
      <DesktopStack.Screen name="SendNotification" component={SendNotificationScreen} />
    </DesktopStack.Navigator>
  );
}

/**
 * Navigation Sidebar - rendered inside the desktop navigator
 */
function NavigationSidebar({
  collapsed,
  onCollapsedChange,
}: {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}) {
  const navigation = useNavigation<any>();
  const role = useAuthStore((state) => state.role);
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin);
  const isAdmin = role === 'admin' || role === 'owner';

  // Get current route name for active state - with defensive coding for initial mount
  const navigationState = useNavigationState((state) => state);

  // Navigate through nested navigation state to find the current route
  // The state structure can be: { routes: [{ name: 'AdaptiveNav', state: { routes: [{ name: 'Dashboard' }] } }] }
  const getCurrentRouteName = (): string => {
    if (!navigationState) return 'Dashboard';

    let currentState = navigationState;

    // Traverse nested navigation states to find the deepest route
    while (currentState?.routes && currentState.index !== undefined) {
      const currentRoute = currentState.routes[currentState.index];
      if (currentRoute?.state) {
        currentState = currentRoute.state as typeof navigationState;
      } else {
        return currentRoute?.name || 'Dashboard';
      }
    }

    return 'Dashboard';
  };

  const currentRouteName = getCurrentRouteName();
  const activeKey = ROUTE_TO_SIDEBAR_KEY[currentRouteName] || 'dashboard';

  // Sidebar navigation structure
  const sections: SidebarSection[] = useMemo(() => {
    const items: SidebarSection[] = [
      {
        items: [
          { key: 'dashboard', label: 'Dashboard', icon: 'home', route: 'Dashboard' },
        ],
      },
      {
        title: 'Inspections',
        items: [
          { key: 'reports', label: 'Reports', icon: 'file-text', route: 'ReportList' },
          { key: 'start', label: 'Start Inspection', icon: 'clipboard-check', route: 'RecordTypeSelect' },
        ],
      },
    ];

    // Admin-only sections
    if (isAdmin || isSuperAdmin) {
      items.push({
        title: 'Management',
        items: [
          { key: 'templates', label: 'Templates', icon: 'layout-template', route: 'TemplateList', adminOnly: true },
          { key: 'records', label: 'Records', icon: 'folder', route: 'RecordTypesList', adminOnly: true },
          { key: 'team', label: 'Team', icon: 'users', route: 'TeamList', adminOnly: true },
        ],
      });
    }

    // Account section
    items.push({
      title: 'Account',
      items: [
        { key: 'settings', label: 'Settings', icon: 'settings', route: 'Settings' },
      ],
    });

    // Super Admin section
    if (isSuperAdmin) {
      items.push({
        title: 'Super Admin',
        items: [
          { key: 'admin', label: 'Admin Dashboard', icon: 'shield', route: 'SuperAdminDashboard', superAdminOnly: true },
        ],
      });
    }

    return items;
  }, [isAdmin, isSuperAdmin]);

  return (
    <Sidebar
      sections={sections}
      activeKey={activeKey}
      collapsed={collapsed}
      onCollapsedChange={onCollapsedChange}
      userRole={role || 'user'}
      isSuperAdmin={isSuperAdmin}
    />
  );
}

/**
 * Impersonation Banner - shows at top of screen when super admin is viewing as another org
 */
function ImpersonationBanner({
  orgName,
  onEndImpersonation
}: {
  orgName: string | null;
  onEndImpersonation: () => void;
}) {
  return (
    <View style={impersonationStyles.banner}>
      <View style={impersonationStyles.bannerContent}>
        <Icon name="eye" size={18} color={colors.white} />
        <Text style={impersonationStyles.bannerText}>
          Viewing as: {orgName || 'Organisation'}
        </Text>
      </View>
      <Pressable
        onPress={onEndImpersonation}
        style={({ pressed }) => [
          impersonationStyles.endButton,
          pressed && impersonationStyles.endButtonPressed,
        ]}
      >
        <Text style={impersonationStyles.endButtonText}>End Session</Text>
      </Pressable>
    </View>
  );
}

const impersonationStyles = StyleSheet.create({
  banner: {
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bannerText: {
    color: colors.white,
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
  endButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  endButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  endButtonText: {
    color: colors.white,
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
  },
});

/**
 * Desktop Navigator with Sidebar Layout
 * Wraps the stack navigator with sidebar in a row layout
 */
function DesktopNavigator() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const role = useAuthStore((state) => state.role);
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin);
  const impersonationContext = useAuthStore((state) => state.impersonationContext);
  const endImpersonation = useAuthStore((state) => state.endImpersonation);

  // Check impersonation from context directly (more reliable than getter)
  const isImpersonating = impersonationContext?.isImpersonating === true;
  const impersonatedRole = impersonationContext?.impersonatedRole;

  // When impersonating, use the impersonated role for nav
  const effectiveRole = isImpersonating ? impersonatedRole : role;
  const isAdmin = effectiveRole === 'admin' || effectiveRole === 'owner';

  // Handler to end impersonation session
  const handleEndImpersonation = useCallback(async () => {
    const result = await endImpersonation();
    if (result.error) {
      console.error('Failed to end impersonation:', result.error);
    }
    // Navigation will update automatically as impersonationContext changes
  }, [endImpersonation]);

  // Build sections based on user role
  const sections: SidebarSection[] = useMemo(() => {
    // Super Admin gets a completely different nav structure (but not when impersonating)
    if (isSuperAdmin && !isImpersonating) {
      return [
        {
          items: [
            { key: 'dashboard', label: 'Dashboard', icon: 'home', route: 'SuperAdminDashboard' },
          ],
        },
        {
          title: 'Administration',
          items: [
            { key: 'organisations', label: 'Organisations', icon: 'building', route: 'OrganisationsList' },
            { key: 'users', label: 'Users', icon: 'users', route: 'UsersList' },
            { key: 'reports', label: 'Reports', icon: 'file-text', route: 'ReportList' },
            { key: 'notifications', label: 'Notifications', icon: 'bell', route: 'NotificationHistory' },
            { key: 'audit', label: 'Audit Logs', icon: 'clipboard-list', route: 'AuditLogs' },
          ],
        },
        {
          title: 'Super Admin',
          items: [
            { key: 'team', label: 'Admin Team', icon: 'shield', route: 'SuperAdminTeam' },
          ],
        },
        {
          title: 'Account',
          items: [
            { key: 'settings', label: 'Settings', icon: 'settings', route: 'Settings' },
          ],
        },
      ];
    }

    // Regular user/admin nav structure
    const items: SidebarSection[] = [
      {
        items: [
          { key: 'dashboard', label: 'Dashboard', icon: 'home', route: 'Dashboard' },
        ],
      },
      {
        title: 'Inspections',
        items: [
          { key: 'start', label: 'Start Inspection', icon: 'clipboard-check', route: 'RecordTypeSelect' },
          { key: 'reports', label: 'Reports', icon: 'file-text', route: 'ReportList' },
        ],
      },
    ];

    // Admin-only sections (Templates, Records, Team)
    if (isAdmin) {
      items.push({
        title: 'Management',
        items: [
          { key: 'templates', label: 'Templates', icon: 'layout-template', route: 'TemplateList' },
          { key: 'records', label: 'Records', icon: 'folder', route: 'RecordTypesList' },
          { key: 'team', label: 'Team', icon: 'users', route: 'TeamList' },
        ],
      });
    }

    // Account section - available to all
    items.push({
      title: 'Account',
      items: [
        { key: 'settings', label: 'Settings', icon: 'settings', route: 'Settings' },
      ],
    });

    return items;
  }, [isAdmin, isSuperAdmin, isImpersonating]);

  return (
    <View style={[styles.desktopContainer, webStyles.desktopContainer as any]}>
      {/* Sidebar */}
      <Sidebar
        sections={sections}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        userRole={effectiveRole || 'user'}
        isSuperAdmin={isSuperAdmin && !isImpersonating}
      />

      {/* Main content wrapper - centers content on wide screens */}
      <View style={[styles.desktopContentWrapper, webStyles.desktopContentWrapper as any]}>
        {/* Impersonation banner - shown when viewing as another org */}
        {isImpersonating && (
          <ImpersonationBanner
            orgName={impersonationContext?.impersonatedOrgName || null}
            onEndImpersonation={handleEndImpersonation}
          />
        )}
        {/* Main content area - constrained to max-width */}
        <View style={[styles.desktopContent, webStyles.desktopContent as any]}>
          <DesktopStackNavigator />
        </View>
      </View>
    </View>
  );
}

/**
 * AdaptiveNavigator - Main export
 * Renders desktop layout with sidebar on web for:
 * - Desktop screens (≥1024px)
 * - Tablets in landscape mode (768-1023px, landscape)
 * - Super admins (always, for full admin access)
 *
 * Mobile/tablet portrait uses bottom tab navigation.
 * Native apps always use bottom tabs (or SuperAdminNavigator).
 *
 * Note: Layout choice is locked on initial load to prevent navigation
 * state loss when resizing/rotating the browser window.
 */
export function AdaptiveNavigator() {
  const { isWeb, isDesktop, isTablet, isLandscape } = useResponsive();
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin);
  const organisation = useAuthStore((state) => state.organisation);
  const loadBilling = useBillingStore((state) => state.loadAll);

  // Determine if we should show sidebar layout
  // - Desktop (≥1024px): always sidebar
  // - Tablet in landscape (768-1023px): sidebar (better use of horizontal space)
  // - Tablet in portrait / Mobile: bottom tabs
  const shouldShowSidebar = isDesktop || (isTablet && isLandscape);

  // Lock the initial layout choice to prevent navigator swap on resize/rotate
  // This preserves navigation state when resizing browser window
  const initialSidebarRef = useRef<boolean | null>(null);
  if (initialSidebarRef.current === null) {
    initialSidebarRef.current = shouldShowSidebar;
  }
  const lockedShowSidebar = initialSidebarRef.current;

  // Initialize billing data when organisation is available
  useEffect(() => {
    console.log('[AdaptiveNavigator] Organisation check:', {
      hasOrg: !!organisation,
      orgId: organisation?.id,
    });
    if (organisation?.id) {
      console.log('[AdaptiveNavigator] Loading billing for org:', organisation.id);
      loadBilling(organisation.id);
    }
  }, [organisation?.id, loadBilling]);

  // Web: Super admins always get sidebar navigation (regardless of window size)
  if (isWeb && isSuperAdmin) {
    return <DesktopNavigator />;
  }

  // Web with sidebar: Desktop or tablet in landscape
  // Uses locked initial value to prevent navigator swap on resize/rotate
  if (isWeb && lockedShowSidebar) {
    return <DesktopNavigator />;
  }

  // Mobile/tablet/native: Super admins get dedicated tab bar with cross-org views
  if (isSuperAdmin) {
    return <SuperAdminNavigator />;
  }

  // Mobile/tablet/native: Bottom tab navigation for regular users
  return <MainNavigator />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    backgroundColor: colors.background,
  },
  desktopContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
  },
  desktopContentWrapper: {
    flex: 1,
    backgroundColor: '#f1f5f9', // Subtle bg to distinguish from content
  },
  desktopContent: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

export default AdaptiveNavigator;
