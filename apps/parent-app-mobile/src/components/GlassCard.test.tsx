import React from 'react';
import { render } from '@testing-library/react-native';
import GlassCard from './GlassCard';
import { Text } from 'react-native';

describe('GlassCard', () => {
  it('should render children', () => {
    const { getByText } = render(
      <GlassCard>
        <Text>Test Content</Text>
      </GlassCard>
    );

    expect(getByText('Test Content')).toBeTruthy();
  });

  it('should apply default variant styles', () => {
    const { getByTestId } = render(
      <GlassCard>
        <Text testID="content">Content</Text>
      </GlassCard>
    );

    expect(getByTestId('content')).toBeTruthy();
  });

  it('should apply elevated variant', () => {
    const { getByTestId } = render(
      <GlassCard variant="elevated">
        <Text testID="content">Content</Text>
      </GlassCard>
    );

    expect(getByTestId('content')).toBeTruthy();
  });

  it('should apply alert variant', () => {
    const { getByTestId } = render(
      <GlassCard variant="alert">
        <Text testID="content">Alert Content</Text>
      </GlassCard>
    );

    expect(getByTestId('content')).toBeTruthy();
  });

  it('should apply success variant', () => {
    const { getByTestId } = render(
      <GlassCard variant="success">
        <Text testID="content">Success Content</Text>
      </GlassCard>
    );

    expect(getByTestId('content')).toBeTruthy();
  });

  it('should accept custom styles', () => {
    const customStyle = { marginTop: 20 };
    const { getByTestId } = render(
      <GlassCard style={customStyle}>
        <Text testID="content">Content</Text>
      </GlassCard>
    );

    expect(getByTestId('content')).toBeTruthy();
  });
});
