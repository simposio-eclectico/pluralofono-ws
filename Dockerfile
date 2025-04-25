# Use official Node.js LTS image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json if exists
COPY package.json ./

# Install dependencies
RUN npm install --production

# Copy source files
COPY src ./src

# Expose the port the WebSocket server runs on
EXPOSE 9870

# Start the server
CMD ["npm", "start"]
