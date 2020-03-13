const config = require('../../config');

module.exports = {
  lintOnSave: false,
  transpileDependencies: [
    'vuetify',
  ],
  devServer: {
    host: config.host,
    port: 8080,
  },
};
