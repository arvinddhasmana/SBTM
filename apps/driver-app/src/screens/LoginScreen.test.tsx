import React from 'react';
import renderer from 'react-test-renderer';
import LoginScreen from '../screens/LoginScreen';
import { useDriverStore } from '../store/useDriverStore';

jest.mock('../store/useDriverStore', () => ({
    useDriverStore: jest.fn(),
}));

describe('LoginScreen Snapshot', () => {
    it('renders correctly', () => {
        (useDriverStore as unknown as jest.Mock).mockImplementation((selector) => {
            const state = {
                login: jest.fn(),
                isAuthenticated: false
            };
            if (selector) return selector(state);
            return state;
        });

        const tree = renderer.create(<LoginScreen />).toJSON();
        expect(tree).toBeTruthy();
    });
});
