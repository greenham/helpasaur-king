# Use an official Node.js runtime as the base image
FROM node:14 as base

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock) for dependency installation
COPY package*.json ./

# Install project dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

FROM base as dev
ENV NODE_ENV=development
CMD ["npm", "run", "start:dev"]

FROM base as prod
ENV NODE_ENV=production

# Build the TypeScript code
RUN npm run build

# Specify the command to run the application
CMD ["npm", "run", "start"]
