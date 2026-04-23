#!/bin/bash

# Default commit message if none is provided
message="Update"

if [ -n "$1" ]; then
    message="$1"
fi

echo "Adding changes..."
git add .

echo "Committing with message: '$message'"
git commit -m "$message"

echo "Pushing to GitHub..."
git push

echo "Done! 🚀"
