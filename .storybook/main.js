module.exports = {
  stories: ['../stories/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/react-webpack5',
    options: {},
  },
  docs: {
    autodocs: false,
  },
  babel: async options => ({
    ...options,
    presets: [
      ...(options.presets || []),
      [
        require.resolve('@babel/preset-typescript'),
        { allExtensions: true, isTSX: true },
      ],
    ],
  }),
}
