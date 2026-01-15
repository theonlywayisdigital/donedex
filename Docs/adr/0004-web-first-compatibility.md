# ADR 0004: Web-First Compatibility

## Status

Accepted

## Context

While Donedex is primarily a tablet app for field inspections, several features require web compatibility:

- Admin dashboards used on desktop
- Super admin management interface
- Template builder (complex UI better on desktop)
- Report viewing and export

React Native with Expo supports web, but many native libraries don't.

## Decision

We will maintain **web compatibility as a first-class requirement**:

### Development Rules

1. Test all features on web browser, not just iOS/Android
2. Use platform-specific files when native libraries don't support web:
   - `.tsx` for web
   - `.native.tsx` for native-only
3. Avoid libraries without web support (or wrap them)
4. Use HTML5 APIs for web when RN equivalents fail

### Platform File Pattern

```
Component.tsx         # Shared or web implementation
Component.native.tsx  # Native-only implementation
```

### Libraries to Avoid or Wrap

| Library | Issue | Solution |
|---------|-------|----------|
| react-native-draggable-flatlist | No web support | Custom web wrapper |
| react-native-maps | Limited web | Leaflet for web |
| expo-camera | Works but different API | Platform check |
| react-native-reanimated | Works, needs config | Ensure web config |

### Web-Safe Alternatives

- **expo-image** instead of react-native-fast-image
- **expo-file-system** with web polyfills
- **@react-native-async-storage** (works on web)

## Consequences

### Positive

- Admin features work on any device
- No need for separate web admin portal
- Single codebase for all platforms
- Better developer experience (hot reload in browser)

### Negative

- Some animations/interactions less smooth on web
- Testing matrix larger (iOS + Android + Web)
- Some native features unavailable on web

### Neutral

- Build configuration slightly more complex
- May need conditional feature flags

## Related Files

- Platform-specific components in `/src/components/`
- Web configuration in `metro.config.js` and `app.json`
