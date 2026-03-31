# ─────────────────────────────────────────────
# Stage 1: Build
# ─────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies (yarn.lock for reproducible installs)
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Copy source and compile TypeScript
COPY . .
RUN yarn build


# ─────────────────────────────────────────────
# Stage 2: Production image
# ─────────────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Install only production dependencies
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production && yarn cache clean

# Copy compiled output from builder stage
COPY --from=builder /app/dist ./dist

# Prompt templates (read at runtime by ProvidersService; not part of TS emit)
COPY --from=builder /app/docs ./docs

# Copy secrets needed at runtime (Google Service Account for FCM)
# These files are referenced via GOOGLE_APPLICATION_CREDENTIALS env var.
# On Back4App, mount them as a secret or include them here if not sensitive
# in your deployment pipeline.
COPY secrets/ ./secrets/

# Expose the port defined in .env (PORT=7000)
EXPOSE 7000

# Start the compiled NestJS app
CMD ["node", "dist/main"]
