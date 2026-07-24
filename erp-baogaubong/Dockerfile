# ===== Build =====
FROM node:22-alpine AS builder
WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install
COPY . .
RUN npx prisma generate && NODE_ENV=production pnpm build
# Goi tao admin dau tien: dong goi thanh 1 file JS chay bang `node`.
# Chi de @prisma/client ngoai (co san + engine o runner); bcryptjs GOI GON vao file (khong co san trong node_modules runner).
RUN node_modules/.bin/esbuild scripts/create-admin.ts --bundle --platform=node --format=cjs \
    --external:@prisma/client --outfile=create-admin.cjs
# Prisma Client da generate (client + engine musl cho alpine) — lay ban file THAT (deref symlink pnpm) de bo vao runner.
RUN mkdir -p /export && cp -rL node_modules/.pnpm/@prisma+client@*/node_modules/.prisma /export/.prisma

# ===== Run =====
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000
RUN apk add --no-cache postgresql-client && addgroup -S app && adduser -S app -G app
# next output standalone: server.js + node_modules toi thieu (da bao gom @prisma/client + bcryptjs bundled)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
# Prisma Client da generate (Next standalone khong trace .prisma → phai chep tay)
COPY --from=builder /export/.prisma ./node_modules/.prisma
COPY --from=builder /app/create-admin.cjs ./create-admin.cjs
COPY docker-entrypoint.sh ./
# Prisma CLI rieng, chi de chay `migrate deploy` (khong dinh toi node_modules cua app)
RUN mkdir -p /opt/prisma-cli && cd /opt/prisma-cli && npm init -y >/dev/null 2>&1 \
    && npm install --no-save prisma@5.22.0 && npm cache clean --force
RUN chmod +x docker-entrypoint.sh && mkdir -p uploads && chown -R app:app /app
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
ENTRYPOINT ["./docker-entrypoint.sh"]
