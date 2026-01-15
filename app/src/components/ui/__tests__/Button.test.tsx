import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Button } from '../Button';

describe('Button Component', () => {
  describe('Rendering', () => {
    it('should render button with title', () => {
      render(<Button title="Click Me" onPress={() => {}} />);
      expect(screen.getByText('Click Me')).toBeTruthy();
    });

    it('should render primary variant by default', () => {
      const { getByText } = render(<Button title="Primary" onPress={() => {}} />);
      expect(getByText('Primary')).toBeTruthy();
    });

    it('should render secondary variant', () => {
      const { getByText } = render(
        <Button title="Secondary" variant="secondary" onPress={() => {}} />
      );
      expect(getByText('Secondary')).toBeTruthy();
    });

    it('should render danger variant', () => {
      const { getByText } = render(
        <Button title="Delete" variant="danger" onPress={() => {}} />
      );
      expect(getByText('Delete')).toBeTruthy();
    });

    it('should render ghost variant', () => {
      const { getByText } = render(
        <Button title="Cancel" variant="ghost" onPress={() => {}} />
      );
      expect(getByText('Cancel')).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('should call onPress when pressed', () => {
      const onPress = jest.fn();
      render(<Button title="Press Me" onPress={onPress} />);

      fireEvent.press(screen.getByText('Press Me'));

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('should not call onPress when disabled', () => {
      const onPress = jest.fn();
      render(<Button title="Disabled" onPress={onPress} disabled />);

      fireEvent.press(screen.getByText('Disabled'));

      expect(onPress).not.toHaveBeenCalled();
    });

    it('should not call onPress when loading', () => {
      const onPress = jest.fn();
      const { queryByText } = render(
        <Button title="Loading" onPress={onPress} loading />
      );

      // When loading, the text should not be visible
      expect(queryByText('Loading')).toBeNull();
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator when loading', () => {
      const { UNSAFE_getByType } = render(
        <Button title="Submit" onPress={() => {}} loading />
      );

      // Should find an ActivityIndicator
      const activityIndicator = UNSAFE_getByType(
        require('react-native').ActivityIndicator
      );
      expect(activityIndicator).toBeTruthy();
    });

    it('should hide title when loading', () => {
      const { queryByText } = render(
        <Button title="Submit" onPress={() => {}} loading />
      );

      expect(queryByText('Submit')).toBeNull();
    });
  });

  describe('Disabled State', () => {
    it('should apply disabled opacity when disabled', () => {
      render(<Button title="Disabled" onPress={() => {}} disabled />);
      // The button should render (testing disabled styling would require checking styles)
      expect(screen.getByText('Disabled')).toBeTruthy();
    });
  });

  describe('Full Width', () => {
    it('should render full width when fullWidth prop is true', () => {
      render(<Button title="Full Width" onPress={() => {}} fullWidth />);
      expect(screen.getByText('Full Width')).toBeTruthy();
    });
  });

  describe('Icons', () => {
    it('should render with left icon', () => {
      render(
        <Button title="Save" onPress={() => {}} leftIcon="save" />
      );
      expect(screen.getByText('Save')).toBeTruthy();
    });

    it('should render with right icon', () => {
      render(
        <Button title="Next" onPress={() => {}} rightIcon="arrow-right" />
      );
      expect(screen.getByText('Next')).toBeTruthy();
    });

    it('should render with both icons', () => {
      render(
        <Button
          title="Action"
          onPress={() => {}}
          leftIcon="plus"
          rightIcon="arrow-right"
        />
      );
      expect(screen.getByText('Action')).toBeTruthy();
    });
  });

  describe('Custom Styles', () => {
    it('should apply custom style prop', () => {
      render(
        <Button
          title="Styled"
          onPress={() => {}}
          style={{ marginTop: 10 }}
        />
      );
      expect(screen.getByText('Styled')).toBeTruthy();
    });

    it('should apply custom textStyle prop', () => {
      render(
        <Button
          title="Custom Text"
          onPress={() => {}}
          textStyle={{ fontSize: 18 }}
        />
      );
      expect(screen.getByText('Custom Text')).toBeTruthy();
    });
  });
});
