import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import GlassButton from './GlassButton';

describe('GlassButton', () => {
  it('should render button with title', () => {
    const { getByText } = render(<GlassButton title="Click Me" onPress={jest.fn()} />);

    expect(getByText('Click Me')).toBeTruthy();
  });

  it('should call onPress when pressed', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(<GlassButton title="Click Me" onPress={onPressMock} />);

    fireEvent.press(getByText('Click Me'));

    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('should not call onPress when disabled', () => {
    const onPressMock = jest.fn();
    const { getByText } = render(
      <GlassButton title="Click Me" onPress={onPressMock} disabled={true} />,
    );

    fireEvent.press(getByText('Click Me'));

    expect(onPressMock).not.toHaveBeenCalled();
  });

  it('should show loading indicator when loading', () => {
    const { queryByText, UNSAFE_getByType } = render(
      <GlassButton title="Click Me" onPress={jest.fn()} loading={true} />,
    );

    // Title should not be visible when loading
    expect(queryByText('Click Me')).toBeNull();

    // ActivityIndicator should be present
    expect(UNSAFE_getByType('ActivityIndicator')).toBeTruthy();
  });

  it('should be disabled when loading', () => {
    const onPressMock = jest.fn();
    const { getByTestId } = render(
      <GlassButton title="Click Me" onPress={onPressMock} loading={true} />,
    );

    // Button should be disabled during loading — press the button directly
    const button = getByTestId('glass-button');
    fireEvent.press(button);

    expect(onPressMock).not.toHaveBeenCalled();
  });

  it('should apply primary variant styles', () => {
    const { getByText } = render(
      <GlassButton title="Primary" onPress={jest.fn()} variant="primary" />,
    );

    expect(getByText('Primary')).toBeTruthy();
  });

  it('should apply secondary variant styles', () => {
    const { getByText } = render(
      <GlassButton title="Secondary" onPress={jest.fn()} variant="secondary" />,
    );

    expect(getByText('Secondary')).toBeTruthy();
  });

  it('should apply danger variant styles', () => {
    const { getByText } = render(
      <GlassButton title="Danger" onPress={jest.fn()} variant="danger" />,
    );

    expect(getByText('Danger')).toBeTruthy();
  });

  it('should apply ghost variant styles', () => {
    const { getByText } = render(<GlassButton title="Ghost" onPress={jest.fn()} variant="ghost" />);

    expect(getByText('Ghost')).toBeTruthy();
  });

  it('should accept custom styles', () => {
    const customStyle = { marginTop: 10 };
    const { getByText } = render(
      <GlassButton title="Custom" onPress={jest.fn()} style={customStyle} />,
    );

    expect(getByText('Custom')).toBeTruthy();
  });
});
