#!/bin/bash

# Check if a single argument is provided
if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <environment> (where environment is 'dev' or 'prod')"
    exit 1
fi

# Extract the environment argument
environment="$1"

# Build images for the target environment
echo "Building images for $environment"
eval "./build.sh $environment"

# Define the base Docker Compose command
docker_compose_command="docker compose"

# Check the environment and add the appropriate configuration file(s)
if [ "$environment" == "dev" ]; then
    docker_compose_command="$docker_compose_command -f docker-compose.yml"
elif [ "$environment" == "prod" ]; then
    docker_compose_command="$docker_compose_command -f docker-compose.yml -f docker-compose.prod.yml"
else
    echo "Invalid environment. Use 'dev' or 'prod' as the argument."
    exit 1
fi

# Run the Docker Compose command in detached mode
eval "$docker_compose_command up -d"

echo "Docker Compose command for $environment environment is running in detached mode."
