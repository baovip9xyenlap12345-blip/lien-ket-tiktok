#!/bin/sh
# Migration an toan truoc khi mo cong: migrate deploy (khong bao gio dung db push o production)
set -e
echo "[entrypoint] prisma migrate deploy…"
node /opt/prisma-cli/node_modules/prisma/build/index.js migrate deploy --schema=/app/prisma/schema.prisma
echo "[entrypoint] start server"
exec node server.js
