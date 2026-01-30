module.exports = {
  apps: [
    {
      name: "kip-frontend",
      script: "npx",
      args: "serve -s dist -l 8080",
      // O segredo para Windows é esta linha abaixo:
      shell: true,
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    }
  ]
}