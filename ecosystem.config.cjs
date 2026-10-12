// pm2 definition for Appu's Mart ONLY. Start/reload it by name so other pm2 apps on the server are untouched:
//   pm2 start ecosystem.config.cjs        (first time)
//   pm2 reload appus-mart                 (after each deploy)
// Never use `pm2 restart all` / `pm2 delete all` on a shared server.
module.exports = {
  apps: [{
    name: 'appus-mart',
    cwd: __dirname,
    script: 'node_modules/next/dist/bin/next',
    args: `start -p ${process.env.APPUS_MART_PORT || 3005} -H 127.0.0.1`,
    env: { NODE_ENV: 'production' },
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '400M',
    // Stop a crash loop instead of hammering the box (the server already runs other apps).
    max_restarts: 10,
    min_uptime: '20s',
    time: true
  }]
};
