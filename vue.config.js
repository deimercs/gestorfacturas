
module.exports = defineConfig({
  transpileDependencies: true,
  configureWebpack: {
    devServer: {
      allowedHosts: ['.onrender.com'], // ¡Esta es la línea clave!
      // O, si prefieres una opción menos segura (solo para pruebas en Render, NO para producción real):
      // allowedHosts: 'all',
    },
  },
});
