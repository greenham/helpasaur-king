#!/bin/bash

# Script to bump version in all package.json files

if [ $# -eq 0 ]; then
    echo "Usage: ./scripts/bump-version.sh <version>"
    echo "Example: ./scripts/bump-version.sh 1.9.2"
    echo "Example: ./scripts/bump-version.sh patch"
    echo "Example: ./scripts/bump-version.sh minor"
    echo "Example: ./scripts/bump-version.sh major"
    exit 1
fi

VERSION=$1

echo "Bumping version to $VERSION in all package.json files..."

# Update root package.json
npm version $VERSION --no-git-tag-version

# Update all workspace packages
pnpm recursive exec -- npm version $VERSION --no-git-tag-version --allow-same-version

echo "Version bump complete!"
echo "Don't forget to:"
echo "1. Update CHANGELOG.md"
echo "2. Commit changes"
echo "3. Create a GitHub release"