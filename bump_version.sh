#!/bin/bash
# bump-version.sh
# Increments patch version and injects it into sw.js, index.html
# Add to .git/hooks/pre-push or run manually before deploy

set -e

VERSION_FILE=".version"

# Read or initialize version
if [ ! -f "$VERSION_FILE" ]; then
  echo "3.0.0" > "$VERSION_FILE"
fi

CURRENT=$(cat "$VERSION_FILE")
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"
PATCH=$((PATCH + 1))
NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"

echo "Bumping version: $CURRENT → $NEW_VERSION"

# Save new version
echo "$NEW_VERSION" > "$VERSION_FILE"

# Replace placeholder in sw.js
sed -i "s/__APP_VERSION__/$NEW_VERSION/g" sw.js

# Replace placeholder in index.html
sed -i "s/__APP_VERSION__/$NEW_VERSION/g" index.html

echo "✅ Version bumped to $NEW_VERSION"
echo "   Updated: sw.js, index.html"