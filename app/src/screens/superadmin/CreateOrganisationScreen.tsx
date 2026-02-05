/**
 * Create Organisation Screen (Super Admin)
 * Allows super admins to create organisations directly with optional owner and discount
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { showConfirm } from '../../utils/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Input, Icon } from '../../components/ui';
import { useBillingStore } from '../../store/billingStore';
import { createOrganisation as createOrganisationService, type OrgUserToProvision } from '../../services/superAdmin';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import type { SuperAdminStackParamList } from '../../navigation/SuperAdminNavigator';
import type { BillingInterval, SubscriptionPlan } from '../../types/billing';
import { formatLimit, formatUserLimit } from '../../types/billing';

type NavigationProp = NativeStackNavigationProp<SuperAdminStackParamList, 'CreateOrganisation'>;

export function CreateOrganisationScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { plans, loadPlans, isLoadingPlans } = useBillingStore();

  const [formData, setFormData] = useState({
    organisationName: '',
    slug: '',
    contactEmail: '',
    contactPhone: '',
    planId: '',
  });
  const [members, setMembers] = useState<OrgUserToProvision[]>([]);
  const [newMember, setNewMember] = useState<{ firstName: string; lastName: string; email: string; phone: string; role: OrgUserToProvision['role'] }>({ firstName: '', lastName: '', email: '', phone: '', role: 'admin' });
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountNotes, setDiscountNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  // Auto-generate slug from name
  useEffect(() => {
    if (formData.organisationName) {
      const slug = formData.organisationName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      setFormData((prev) => ({ ...prev, slug }));
    }
  }, [formData.organisationName]);

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const ROLE_OPTIONS: Array<{ label: string; value: OrgUserToProvision['role'] }> = [
    { label: 'Admin', value: 'admin' },
    { label: 'User', value: 'user' },
  ];

  const handleAddMember = () => {
    setMemberError(null);
    const firstName = newMember.firstName.trim();
    const lastName = newMember.lastName.trim();
    const email = newMember.email.trim().toLowerCase();
    const phone = newMember.phone.trim() || undefined;

    if (!firstName) {
      setMemberError('First name is required');
      return;
    }
    if (!lastName) {
      setMemberError('Last name is required');
      return;
    }
    if (!email) {
      setMemberError('Email is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMemberError('Please enter a valid email');
      return;
    }
    if (members.some((m) => m.email === email)) {
      setMemberError('This email has already been added');
      return;
    }

    setMembers((prev) => [...prev, { firstName, lastName, email, phone, role: newMember.role }]);
    setNewMember({ firstName: '', lastName: '', email: '', phone: '', role: 'user' as OrgUserToProvision['role'] });
  };

  const handleRemoveMember = (email: string) => {
    setMembers((prev) => prev.filter((m) => m.email !== email));
  };

  const formatPlanPrice = (plan: SubscriptionPlan) => {
    // Free plan
    if (plan.price_monthly_gbp === 0) return 'Free';

    // All paid plans (Pro & Enterprise) use the same format
    const basePrice = billingInterval === 'monthly'
      ? plan.price_monthly_gbp
      : Math.round(plan.price_annual_gbp / 12);
    const perUserPrice = billingInterval === 'monthly'
      ? plan.price_per_user_monthly_gbp
      : Math.round(plan.price_per_user_annual_gbp / 12);

    let priceStr = `£${(basePrice / 100).toFixed(0)}/mo`;
    if (perUserPrice > 0) {
      priceStr += ` + £${(perUserPrice / 100).toFixed(0)}/user`;
    }
    return priceStr;
  };

  const getEffectivePrice = (plan: SubscriptionPlan) => {
    if (plan.price_monthly_gbp === 0) return 'Free';
    if (discountPercent === 100) return 'Free (100% off)';

    const basePrice = billingInterval === 'monthly'
      ? plan.price_monthly_gbp
      : Math.round(plan.price_annual_gbp / 12);
    const perUserPrice = billingInterval === 'monthly'
      ? plan.price_per_user_monthly_gbp
      : Math.round(plan.price_per_user_annual_gbp / 12);

    if (discountPercent > 0) {
      const discountedBase = Math.round(basePrice * (1 - discountPercent / 100));
      const discountedPerUser = Math.round(perUserPrice * (1 - discountPercent / 100));
      let priceStr = `£${(discountedBase / 100).toFixed(0)}/mo`;
      if (discountedPerUser > 0) {
        priceStr += ` + £${(discountedPerUser / 100).toFixed(0)}/user`;
      }
      return `${priceStr} (${discountPercent}% off)`;
    }

    let priceStr = `£${(basePrice / 100).toFixed(0)}/mo`;
    if (perUserPrice > 0) {
      priceStr += ` + £${(perUserPrice / 100).toFixed(0)}/user`;
    }
    return priceStr;
  };

  const validateForm = (): boolean => {
    if (!formData.organisationName.trim()) {
      setError('Organisation name is required');
      return false;
    }
    if (formData.organisationName.trim().length < 2) {
      setError('Organisation name must be at least 2 characters');
      return false;
    }
    if (!formData.contactEmail.trim()) {
      setError('Contact email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail.trim())) {
      setError('Please enter a valid contact email');
      return false;
    }
    if (!formData.planId) {
      setError('Please select a subscription plan');
      return false;
    }
    return true;
  };

  const handleCreate = async () => {
    setError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createOrganisationService({
        name: formData.organisationName.trim(),
        slug: formData.slug.trim() || undefined,
        contactEmail: formData.contactEmail.trim(),
        contactPhone: formData.contactPhone.trim() || undefined,
        users: members.length > 0 ? members : undefined,
        planId: formData.planId || undefined,
        billingInterval,
        discountPercent: discountPercent > 0 ? discountPercent : undefined,
        discountNotes: discountNotes.trim() || undefined,
      });

      if (result.error) {
        setError(typeof result.error === 'string' ? result.error : result.error.message);
        setIsSubmitting(false);
        return;
      }

      const selectedPlan = plans.find(p => p.id === formData.planId);
      const discountText = discountPercent === 100
        ? '\n\nFree access has been granted (100% discount).'
        : discountPercent > 0
          ? `\n\nA ${discountPercent}% discount has been applied.`
          : '';

      const membersText = members.length > 0
        ? `\n\n${members.length} team member${members.length > 1 ? 's' : ''} will receive an email to set their password.`
        : '';

      showConfirm(
        'Organisation Created',
        `${formData.organisationName} has been created on the ${selectedPlan?.name || 'selected'} plan.${membersText}${discountText}`,
        () => {
          if (result.data?.id) {
            navigation.replace('OrganisationDetail', { orgId: result.data.id });
          } else {
            navigation.goBack();
          }
        },
        () => {
          setFormData({
            organisationName: '',
            slug: '',
            contactEmail: '',
            contactPhone: '',
            planId: '',
          });
          setMembers([]);
          setNewMember({ firstName: '', lastName: '', email: '', phone: '', role: 'admin' });
          setDiscountPercent(0);
          setDiscountNotes('');
        },
        'View Organisation',
        'Create Another'
      );

      setIsSubmitting(false);
    } catch (err) {
      console.error('Error creating organisation:', err);
      setError('Failed to create organisation. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Create Organisation</Text>
            <Text style={styles.subtitle}>
              {`Create a new organisation and add team members`}
            </Text>
          </View>

          {/* Error */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Organisation Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Organisation Details</Text>
            <View style={styles.sectionCard}>
              <Input
                label="Organisation Name *"
                placeholder="e.g. ABC Property Management"
                value={formData.organisationName}
                onChangeText={(val) => updateField('organisationName', val)}
                autoCapitalize="words"
              />

              <Input
                label="URL Slug"
                placeholder="auto-generated from name"
                value={formData.slug}
                onChangeText={(val) => updateField('slug', val)}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Input
                label="Contact Email *"
                placeholder="contact@company.com"
                value={formData.contactEmail}
                onChangeText={(val) => updateField('contactEmail', val)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Input
                label="Phone Number"
                placeholder="Optional"
                value={formData.contactPhone}
                onChangeText={(val) => updateField('contactPhone', val)}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Plan Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Subscription Plan</Text>
            <View style={styles.sectionCard}>
              {/* Billing Interval Toggle */}
              <View style={styles.toggleContainer}>
                <TouchableOpacity
                  style={[
                    styles.toggleOption,
                    billingInterval === 'monthly' && styles.toggleOptionActive,
                  ]}
                  onPress={() => setBillingInterval('monthly')}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      billingInterval === 'monthly' && styles.toggleTextActive,
                    ]}
                  >
                    Monthly
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleOption,
                    billingInterval === 'annual' && styles.toggleOptionActive,
                  ]}
                  onPress={() => setBillingInterval('annual')}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      billingInterval === 'annual' && styles.toggleTextActive,
                    ]}
                  >
                    Annual
                  </Text>
                  <View style={styles.saveBadge}>
                    <Text style={styles.saveBadgeText}>Save 20%</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Plan Options */}
              <View style={styles.planOptions}>
                {plans.filter(p => p.is_public).map((plan) => (
                  <TouchableOpacity
                    key={plan.id}
                    style={[
                      styles.planCard,
                      formData.planId === plan.id && styles.planCardSelected,
                      plan.slug === 'pro' && styles.planCardPopular,
                    ]}
                    onPress={() => updateField('planId', plan.id)}
                  >
                    {plan.slug === 'pro' && (
                      <View style={styles.popularBadge}>
                        <Text style={styles.popularBadgeText}>Most Popular</Text>
                      </View>
                    )}

                    <View style={styles.planHeader}>
                      <Text style={styles.planName}>{plan.name}</Text>
                      <Text style={styles.planPrice}>{formatPlanPrice(plan)}</Text>
                    </View>

                    {plan.description && (
                      <Text style={styles.planDescription}>{plan.description}</Text>
                    )}

                    {/* Features */}
                    <View style={styles.featuresContainer}>
                      <FeatureItem text={formatUserLimit(plan, billingInterval)} />
                      <FeatureItem text={`${formatLimit(plan.max_storage_gb)} GB storage`} />
                      <FeatureItem text={`${formatLimit(plan.max_reports_per_month)} reports/month`} />
                      {plan.feature_photos && <FeatureItem text="Photos included" />}
                      {plan.feature_all_field_types
                        ? <FeatureItem text="All field types" />
                        : <FeatureItem text="Basic fields only" />
                      }
                      {plan.feature_ai_templates && <FeatureItem text="AI Templates" />}
                      {plan.feature_starter_templates && <FeatureItem text="Starter templates" />}
                      {plan.feature_custom_branding && <FeatureItem text="Custom branding" />}
                      {plan.feature_api_access && <FeatureItem text="API access" />}
                    </View>

                    {/* Selection indicator */}
                    <View
                      style={[
                        styles.radioOuter,
                        formData.planId === plan.id && styles.radioOuterSelected,
                      ]}
                    >
                      {formData.planId === plan.id && <View style={styles.radioInner} />}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Effective Price with Discount */}
              {formData.planId && discountPercent > 0 && (
                <View style={styles.effectivePriceContainer}>
                  <Text style={styles.effectivePriceLabel}>Effective price:</Text>
                  <Text style={styles.effectivePrice}>
                    {getEffectivePrice(plans.find(p => p.id === formData.planId)!)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Discount Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Discount (Optional)</Text>
            <View style={styles.sectionCard}>
              <Text style={styles.discountLabel}>
                {`Discount: ${discountPercent}%${discountPercent === 100 ? ' (Free Access)' : ''}`}
              </Text>
              <Slider
                style={styles.slider}
                value={discountPercent}
                onValueChange={(val) => setDiscountPercent(Math.round(val))}
                minimumValue={0}
                maximumValue={100}
                step={5}
                minimumTrackTintColor={colors.primary.DEFAULT}
                maximumTrackTintColor={colors.border.light}
                thumbTintColor={colors.primary.DEFAULT}
              />
              <View style={styles.discountMarkers}>
                <Text style={styles.discountMarker}>0%</Text>
                <Text style={styles.discountMarker}>25%</Text>
                <Text style={styles.discountMarker}>50%</Text>
                <Text style={styles.discountMarker}>75%</Text>
                <Text style={styles.discountMarker}>100%</Text>
              </View>

              {discountPercent > 0 && (
                <Input
                  label="Discount reason"
                  placeholder="e.g. Partnership deal, demo account, early adopter"
                  value={discountNotes}
                  onChangeText={setDiscountNotes}
                  multiline
                />
              )}

              {discountPercent === 100 && (
                <View style={styles.freeAccessNote}>
                  <Icon name="info" size={16} color={colors.primary.DEFAULT} />
                  <Text style={styles.freeAccessNoteText}>
                    100% discount grants free access without billing
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Team Members */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Team Members (Optional)</Text>
            <View style={styles.sectionCard}>
              <Text style={styles.memberNote}>
                {`Add admins and users. They'll receive an email to set their password and log in.`}
              </Text>

              {/* Member List */}
              {members.length > 0 && (
                <View style={styles.memberList}>
                  {members.map((member) => (
                    <View key={member.email} style={styles.memberCard}>
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberName}>{`${member.firstName} ${member.lastName}`}</Text>
                        <Text style={styles.memberEmail}>{member.email}</Text>
                      </View>
                      <View style={styles.memberActions}>
                        <View style={[styles.roleBadge, member.role === 'admin' && styles.roleBadgeAdmin]}>
                          <Text style={[styles.roleBadgeText, member.role === 'admin' && styles.roleBadgeTextAdmin]}>
                            {member.role === 'admin' ? 'Admin' : 'User'}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleRemoveMember(member.email)}
                          style={styles.removeButton}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Icon name="x" size={16} color={colors.text.secondary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Add Member Form */}
              <View style={styles.addMemberForm}>
                <Text style={styles.addMemberTitle}>Add member</Text>

                <Input
                  label="First name"
                  placeholder="First name"
                  value={newMember.firstName}
                  onChangeText={(val) => setNewMember((prev) => ({ ...prev, firstName: val }))}
                  autoCapitalize="words"
                />

                <Input
                  label="Last name"
                  placeholder="Last name"
                  value={newMember.lastName}
                  onChangeText={(val) => setNewMember((prev) => ({ ...prev, lastName: val }))}
                  autoCapitalize="words"
                />

                <Input
                  label="Email"
                  placeholder="user@company.com"
                  value={newMember.email}
                  onChangeText={(val) => setNewMember((prev) => ({ ...prev, email: val }))}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Input
                  label="Phone number (optional)"
                  placeholder="Optional"
                  value={newMember.phone}
                  onChangeText={(val) => setNewMember((prev) => ({ ...prev, phone: val }))}
                  keyboardType="phone-pad"
                />

                <Text style={styles.roleLabel}>Role</Text>
                <View style={styles.roleSelector}>
                  {ROLE_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.roleOption,
                        newMember.role === opt.value && styles.roleOptionActive,
                      ]}
                      onPress={() => setNewMember((prev) => ({ ...prev, role: opt.value }))}
                    >
                      <Text
                        style={[
                          styles.roleOptionText,
                          newMember.role === opt.value && styles.roleOptionTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {memberError && (
                  <Text style={styles.memberErrorText}>{memberError}</Text>
                )}

                <TouchableOpacity style={styles.addButton} onPress={handleAddMember}>
                  <Icon name="plus" size={18} color={colors.primary.DEFAULT} />
                  <Text style={styles.addButtonText}>Add member</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              title="Create Organisation"
              onPress={handleCreate}
              loading={isSubmitting}
              fullWidth
            />
            <Button
              title="Cancel"
              onPress={() => navigation.goBack()}
              variant="ghost"
              fullWidth
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureCheck}>✓</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.pageTitle,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSize.caption,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginLeft: spacing.sm,
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: spacing.lg,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.border.light,
    borderRadius: borderRadius.md,
    padding: 4,
    marginBottom: spacing.lg,
  },
  toggleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md - 2,
  },
  toggleOptionActive: {
    backgroundColor: colors.white,
  },
  toggleText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
  },
  toggleTextActive: {
    color: colors.text.primary,
  },
  saveBadge: {
    backgroundColor: colors.success,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    marginLeft: spacing.xs,
  },
  saveBadgeText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  planOptions: {
    marginBottom: spacing.sm,
  },
  planCard: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.border.light,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    position: 'relative',
  },
  planCardSelected: {
    borderColor: colors.primary.DEFAULT,
  },
  planCardPopular: {
    // No border - uses "Most Popular" badge instead to avoid confusion with selected state
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: spacing.md,
    backgroundColor: colors.primary.DEFAULT,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  popularBadgeText: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.xs,
    paddingRight: spacing.xl,
  },
  planName: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  planPrice: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.primary.DEFAULT,
  },
  planDescription: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  featuresContainer: {
    marginBottom: spacing.xs,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  featureCheck: {
    fontSize: fontSize.caption,
    color: colors.success,
    fontWeight: fontWeight.bold,
    marginRight: spacing.xs,
  },
  featureText: {
    fontSize: fontSize.caption,
    color: colors.text.primary,
  },
  radioOuter: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border.light,
    alignItems: 'center',
    justifyContent: 'center',
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
  effectivePriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.success + '15',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  effectivePriceLabel: {
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  effectivePrice: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  discountLabel: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  discountMarkers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  discountMarker: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  freeAccessNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.light,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  freeAccessNoteText: {
    fontSize: fontSize.caption,
    color: colors.primary.DEFAULT,
    flex: 1,
  },
  memberNote: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  memberList: {
    marginBottom: spacing.md,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  memberInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  memberName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
  memberEmail: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  roleBadge: {
    backgroundColor: colors.border.light,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  roleBadgeAdmin: {
    backgroundColor: colors.primary.light,
  },
  roleBadgeText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
  },
  roleBadgeTextAdmin: {
    color: colors.primary.DEFAULT,
  },
  removeButton: {
    padding: spacing.xs,
  },
  addMemberForm: {
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    paddingTop: spacing.md,
  },
  addMemberTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  roleLabel: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  roleSelector: {
    flexDirection: 'row',
    backgroundColor: colors.border.light,
    borderRadius: borderRadius.md,
    padding: 4,
    marginBottom: spacing.md,
  },
  roleOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md - 2,
  },
  roleOptionActive: {
    backgroundColor: colors.white,
  },
  roleOptionText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
  },
  roleOptionTextActive: {
    color: colors.primary.DEFAULT,
  },
  memberErrorText: {
    fontSize: fontSize.caption,
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.md,
    borderStyle: 'dashed',
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  addButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.primary.DEFAULT,
  },
  actions: {
    marginTop: spacing.md,
  },
});
