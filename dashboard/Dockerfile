# dashboard/Dockerfile
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy dependencies
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all files
COPY . .

# Build the Next.js app
RUN npm run build

# Expose default port
EXPOSE 3000

# Start the frontend
CMD ["npm", "start"]
