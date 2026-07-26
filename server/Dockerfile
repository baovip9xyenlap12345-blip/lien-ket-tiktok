FROM node:20-slim

# ffmpeg: xu ly video + day RTMP; fonts-noto-core: chu tieng Viet du dau cho overlay drawtext
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg fonts-noto-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY . .

ENV PORT=3000
EXPOSE 3000
CMD ["node", "index.js"]
