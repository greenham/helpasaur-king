#!/bin/bash

# Check if the target environment argument is provided and is valid
if [ $# -ne 1 ] || [[ "$1" != "dev" && "$1" != "prod" ]]; then
    echo "Usage: $0 <target_environment> (where target_environment is 'dev' or 'prod')"
    exit 1
fi

# Define the list of services to build
services=("api" "discord" "racebot" "runnerwatcher" "twitch" "web" "ws-relay")

# Set the base tag for all builds
base_tag="helpasaur-king"

# Extract the target environment from the command line argument
target_environment="$1"

# Build images for the target environment
echo "Building images for $environment"

# Loop through the services and run the Docker build command with the specified target environment
for service in "${services[@]}"; do
    # Define the full tag for this service
    tag="${base_tag}-${service}:${target_environment}"

    # Run the Docker build command for the specified service, tag, and target environment
    echo "Building $service with tag: $tag"
    docker build -t "$tag" --target="$target_environment" "./$service"
done
