# ADR 0003: State Management with Zustand

## Status

Accepted

## Context

We needed a state management solution that:

- Works with React Native and Expo
- Supports TypeScript well
- Is lightweight (bundle size matters for mobile)
- Handles async operations cleanly
- Supports persistence for offline scenarios

Options considered:
- Redux Toolkit: Powerful but heavy, boilerplate-heavy
- MobX: Good but different paradigm, larger bundle
- Zustand: Lightweight, minimal boilerplate, good TS support
- Jotai/Recoil: Atomic approach, potentially complex for our needs

## Decision

We will use **Zustand** for all application state management.

### Store Structure

```
/src/store/
├── authStore.ts         # Authentication state
├── inspectionStore.ts   # Active inspection state
├── recordsStore.ts      # Records/sites list state
├── sitesStore.ts        # Sites management
├── billingStore.ts      # Subscription state
├── onboardingStore.ts   # Onboarding flow state
└── index.ts             # Exports
```

### Patterns

1. **Computed properties**: Use getters for derived state
2. **Async actions**: Actions return promises, set loading/error states
3. **Local persistence**: Integration with localStorage service for offline
4. **Selectors**: Use shallow equality to prevent unnecessary re-renders

### Example Pattern

```typescript
const useInspectionStore = create<InspectionState>((set, get) => ({
  // State
  report: null,
  isLoading: false,
  error: null,

  // Computed
  get progress() {
    const { completedItems, totalItems } = get();
    return totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
  },

  // Actions
  startInspection: async (params) => {
    set({ isLoading: true, error: null });
    try {
      // ... async work
      set({ report: result, isLoading: false });
    } catch (err) {
      set({ error: err.message, isLoading: false });
    }
  },
}));
```

## Consequences

### Positive

- Minimal boilerplate
- Excellent TypeScript support
- Small bundle size (~2KB)
- Works seamlessly with React Native
- Easy integration with async storage

### Negative

- Less ecosystem tooling than Redux
- No built-in devtools (though zustand/devtools middleware exists)
- Less established patterns for very large applications

### Neutral

- Team needs to learn Zustand-specific patterns
- Migration from other solutions relatively easy

## Related

- Zustand documentation: https://github.com/pmndrs/zustand
