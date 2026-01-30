const path = require("path");

module.exports = {
  apps: [
    {
      name: "kip-backend",
      script: path.join(__dirname, "src", "index.js"),
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 2050,
      },
    },
  ],
};
