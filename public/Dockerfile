FROM node:18

WORKDIR /app

# Copy local frontend files
COPY . .

# Install live-server
RUN npm install -g live-server

# Expose the default dev server port
EXPOSE 3000

# Start the live server to watch for changes
CMD ["live-server", "--host=0.0.0.0", "--port=3000", "--entry-file=index.html"]
