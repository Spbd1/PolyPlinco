FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_GAME_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000001
ARG NEXT_PUBLIC_PPL_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000002
ARG NEXT_PUBLIC_NETWORK_ID=137
ARG NEXT_PUBLIC_RPC_URL=
ENV NEXT_PUBLIC_GAME_CONTRACT_ADDRESS=$NEXT_PUBLIC_GAME_CONTRACT_ADDRESS \
    NEXT_PUBLIC_PPL_CONTRACT_ADDRESS=$NEXT_PUBLIC_PPL_CONTRACT_ADDRESS \
    NEXT_PUBLIC_NETWORK_ID=$NEXT_PUBLIC_NETWORK_ID \
    NEXT_PUBLIC_RPC_URL=$NEXT_PUBLIC_RPC_URL
RUN pnpm build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
