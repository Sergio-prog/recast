FROM oven/bun:1.3 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run vocabs && bun run build

FROM oven/bun:1.3
RUN apt-get update && apt-get install -y --no-install-recommends \
		ffmpeg \
		libarchive-tools \
		libheif-examples \
		python3 \
		ca-certificates \
		curl \
	&& curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
	&& chmod +x /usr/local/bin/yt-dlp \
	&& apt-get purge -y curl \
	&& apt-get autoremove -y \
	&& apt-get clean \
	&& rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json bun.lock server.mjs ./
RUN bun install --frozen-lockfile --production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN bunx playwright-core install --with-deps chromium-headless-shell
COPY --from=build /app/dist ./dist
ENV NODE_ENV=production \
	PORT=3000 \
	CHROMIUM_NO_SANDBOX=1
EXPOSE 3000
CMD ["bun", "server.mjs"]
