module.exports = {
    preset: 'jest-expo',
    maxWorkers: 2,
    testPathIgnorePatterns: ['<rootDir>/e2e/'],
    transformIgnorePatterns: [
        'node_modules/(?!(?:\\.pnpm/[^/]+/node_modules/)?((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-ble-plx|@react-native/js-polyfills))'
    ],
    setupFiles: ['<rootDir>/jest.env.js'],
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    moduleNameMapper: {
        '@react-native-async-storage/async-storage': require.resolve(
            '@react-native-async-storage/async-storage/jest/async-storage-mock'
        ),
    },
};
