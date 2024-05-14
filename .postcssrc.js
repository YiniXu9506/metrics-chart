const PrefixWrap = require('postcss-prefixwrap')

module.exports = {
  plugins: [
    PrefixWrap('.metrics-chart-light', { whitelist: ['light_theme.css'] }),
    PrefixWrap('.metrics-chart-dark', { whitelist: ['dark_theme.css'] }),
  ],
}
