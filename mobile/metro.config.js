const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add resolution for common issues
config.resolver.extraNodeModules = {
    '@react-native-async-storage/async-storage': require.resolve('@react-native-async-storage/async-storage'),
};

module.exports = config;
