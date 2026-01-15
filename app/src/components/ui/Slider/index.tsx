/**
 * Slider - Platform-specific slider input
 * Uses @react-native-community/slider on native, HTML5 range on web
 */

import { Platform } from 'react-native';

export type { SliderProps } from './types';

// Platform-specific export
import SliderNative from './Slider.native';
import SliderWeb from './Slider.web';

const Slider = Platform.OS === 'web' ? SliderWeb : SliderNative;

export default Slider;
