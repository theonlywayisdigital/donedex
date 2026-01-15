/**
 * Onboarding Navigator
 * Stack navigator for the onboarding wizard flow
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Screens
import { WelcomeScreen } from '../screens/onboarding/WelcomeScreen';
import { CreateAccountScreen } from '../screens/onboarding/CreateAccountScreen';
import { OrganisationDetailsScreen } from '../screens/onboarding/OrganisationDetailsScreen';
import { SelectPlanScreen } from '../screens/onboarding/SelectPlanScreen';
import { PaymentScreen } from '../screens/onboarding/PaymentScreen';
import { InviteTeamScreen } from '../screens/onboarding/InviteTeamScreen';
import { ChooseTemplatesScreen } from '../screens/onboarding/ChooseTemplatesScreen';
import { CompleteScreen } from '../screens/onboarding/CompleteScreen';

export type OnboardingStackParamList = {
  Welcome: undefined;
  CreateAccount: undefined;
  OrganisationDetails: undefined;
  SelectPlan: undefined;
  Payment: undefined;
  InviteTeam: undefined;
  ChooseTemplates: undefined;
  Complete: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: false, // Prevent swipe back during onboarding
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
      <Stack.Screen name="OrganisationDetails" component={OrganisationDetailsScreen} />
      <Stack.Screen name="SelectPlan" component={SelectPlanScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="InviteTeam" component={InviteTeamScreen} />
      <Stack.Screen name="ChooseTemplates" component={ChooseTemplatesScreen} />
      <Stack.Screen name="Complete" component={CompleteScreen} />
    </Stack.Navigator>
  );
}
