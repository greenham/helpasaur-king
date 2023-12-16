#!/bin/bash

# Extract the container ID of the nginx container via docker ps
container_id=$(docker ps | grep helpa-nginx | awk '{print $1}')

# Stop the nginx container
docker stop $container_id

# Run certbot renew
certbot renew

# Start the nginx container
docker start $container_id
