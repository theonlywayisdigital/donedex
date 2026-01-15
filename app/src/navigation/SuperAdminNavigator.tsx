/**
 * Super Admin Navigator
 * Dedicated tab navigation for super admin users with cross-org access
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Icon } from '../components/ui';
import { colors, fontSize } from '../constants/theme';
import {
  SuperAdminDashboardScreen,
  OrganisationsListScreen,
  OrganisationDetailScreen,
  CreateOrganisationScreen,
  UsersListScreen,
  UserDetailScreen,
  AuditLogsScreen,
  AllReportsListScreen,
  SendNotificationScreen,
  NotificationHistoryScreen,
} from '../screens/superadmin';
import {
  SettingsScreen,
  ProfileScreen,
  ChangePasswordScreen,
  AboutScreen,
} from '../screens/settings';

// Dashboard Stack
export type DashboardStackParamList = {
  SuperAdminDashboard: undefined;
};

const DashboardStack = createNativeStackNavigator<DashboardStackParamList>();

function DashboardNavigator() {
  return (
    <DashboardStack.Navigator screenOptions={{ headerShown: false }}>
      <DashboardStack.Screen
        name="SuperAdminDashboard"
        component={SuperAdminDashboardScreen}
      />
    </DashboardStack.Navigator>
  );
}

// Organisations Stack
export type OrgsStackParamList = {
  OrganisationsList: undefined;
  OrganisationDetail: { orgId: string };
  CreateOrganisation: undefined;
};

const OrgsStack = createNativeStackNavigator<OrgsStackParamList>();

function OrgsNavigator() {
  return (
    <OrgsStack.Navigator>
      <OrgsStack.Screen
        name="OrganisationsList"
        component={OrganisationsListScreen}
        options={{ title: 'Organisations' }}
      />
      <OrgsStack.Screen
        name="OrganisationDetail"
        component={OrganisationDetailScreen}
        options={{ title: 'Organisation' }}
      />
      <OrgsStack.Screen
        name="CreateOrganisation"
        component={CreateOrganisationScreen}
        options={{ title: 'Create Organisation' }}
      />
    </OrgsStack.Navigator>
  );
}

// Users Stack
export type UsersStackParamList = {
  UsersList: undefined;
  UserDetail: { userId: string };
};

const UsersStack = createNativeStackNavigator<UsersStackParamList>();

function UsersNavigator() {
  return (
    <UsersStack.Navigator>
      <UsersStack.Screen
        name="UsersList"
        component={UsersListScreen}
        options={{ title: 'All Users' }}
      />
      <UsersStack.Screen
        name="UserDetail"
        component={UserDetailScreen}
        options={{ title: 'User Details' }}
      />
    </UsersStack.Navigator>
  );
}

// Reports Stack
export type ReportsStackParamList = {
  AllReportsList: undefined;
};

const ReportsStack = createNativeStackNavigator<ReportsStackParamList>();

function ReportsNavigator() {
  return (
    <ReportsStack.Navigator>
      <ReportsStack.Screen
        name="AllReportsList"
        component={AllReportsListScreen}
        options={{ title: 'All Reports' }}
      />
    </ReportsStack.Navigator>
  );
}

// Audit Stack
export type AuditStackParamList = {
  AuditLogs: undefined;
};

const AuditStack = createNativeStackNavigator<AuditStackParamList>();

function AuditNavigator() {
  return (
    <AuditStack.Navigator>
      <AuditStack.Screen
        name="AuditLogs"
        component={AuditLogsScreen}
        options={{ title: 'Audit Logs' }}
      />
    </AuditStack.Navigator>
  );
}

// Notifications Stack
export type NotificationsStackParamList = {
  NotificationHistory: undefined;
  SendNotification: undefined;
};

const NotificationsStack = createNativeStackNavigator<NotificationsStackParamList>();

function NotificationsNavigator() {
  return (
    <NotificationsStack.Navigator>
      <NotificationsStack.Screen
        name="NotificationHistory"
        component={NotificationHistoryScreen}
        options={{ title: 'Notifications' }}
      />
      <NotificationsStack.Screen
        name="SendNotification"
        component={SendNotificationScreen}
        options={{ title: 'Send Notification' }}
      />
    </NotificationsStack.Navigator>
  );
}

// Settings Stack (Super Admin specific)
export type SuperAdminSettingsStackParamList = {
  Settings: undefined;
  Profile: undefined;
  ChangePassword: undefined;
  About: undefined;
};

const SettingsStack = createNativeStackNavigator<SuperAdminSettingsStackParamList>();

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
        name="About"
        component={AboutScreen}
        options={{ title: 'About' }}
      />
    </SettingsStack.Navigator>
  );
}

// Combined stack param list for navigation typing
// This is needed for screens that navigate across different stacks
export type SuperAdminStackParamList =
  DashboardStackParamList &
  OrgsStackParamList &
  UsersStackParamList &
  ReportsStackParamList &
  AuditStackParamList &
  NotificationsStackParamList &
  SuperAdminSettingsStackParamList;

// Main Tab Navigator for Super Admin
export type SuperAdminTabParamList = {
  DashboardTab: undefined;
  OrgsTab: undefined;
  UsersTab: undefined;
  ReportsTab: undefined;
  NotificationsTab: undefined;
  AuditTab: undefined;
  SettingsTab: undefined;
};

const Tab = createBottomTabNavigator<SuperAdminTabParamList>();

export function SuperAdminNavigator() {
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
        name="DashboardTab"
        component={DashboardNavigator}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Icon name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="OrgsTab"
        component={OrgsNavigator}
        options={{
          tabBarLabel: 'Orgs',
          tabBarIcon: ({ color, size }) => (
            <Icon name="building-2" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="UsersTab"
        component={UsersNavigator}
        options={{
          tabBarLabel: 'Users',
          tabBarIcon: ({ color, size }) => (
            <Icon name="users" size={size} color={color} />
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
      <Tab.Screen
        name="NotificationsTab"
        component={NotificationsNavigator}
        options={{
          tabBarLabel: 'Notify',
          tabBarIcon: ({ color, size }) => (
            <Icon name="bell" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AuditTab"
        component={AuditNavigator}
        options={{
          tabBarLabel: 'Audit',
          tabBarIcon: ({ color, size }) => (
            <Icon name="shield" size={size} color={color} />
          ),
        }}
      />
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
