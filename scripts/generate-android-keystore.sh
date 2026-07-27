#!/bin/bash
# Android Release Keystore Generator for JW Habits
# Run this script to create a proper release keystore

KEYSTORE_FILE="jwnews-release.keystore"  # legacy filename from JW News era
KEY_ALIAS="jwnews"                        # legacy alias (Google Play treats this as immutable once uploaded)
# SECURITY: passwords must be supplied via env vars or interactive prompt.
# Never commit real credentials to this file. See docs/keystore-rotation-2026-07.md
# for the rotation runbook (this script was the source of a P0 leak in 2026-07).
KEYSTORE_PASSWORD="${KEYSTORE_PASSWORD:-}"
KEY_PASSWORD="${KEY_PASSWORD:-$KEYSTORE_PASSWORD}"
if [ -z "$KEYSTORE_PASSWORD" ]; then
  read -s -p "Keystore password: " KEYSTORE_PASSWORD
  echo
  read -s -p "Key password (Enter = same as keystore): " KEY_PASSWORD
  echo
  KEY_PASSWORD="${KEY_PASSWORD:-$KEYSTORE_PASSWORD}"
fi
VALIDITY_DAYS=10000

echo "=================================="
echo "JW Habits Android Keystore Generator"
echo "=================================="
echo ""
echo "This will create a release keystore for Google Play submission."
echo "IMPORTANT: Save these credentials securely (1Password recommended) - you cannot recover them!"
echo "DO NOT commit $KEYSTORE_FILE to git. It is already in .gitignore."
echo ""

# Check if keystore already exists
if [ -f "$KEYSTORE_FILE" ]; then
    echo "⚠️  Keystore already exists: $KEYSTORE_FILE"
    read -p "Overwrite? (y/N): " confirm
    if [[ $confirm != [yY] ]]; then
        echo "Aborted."
        exit 1
    fi
fi

# Generate keystore
echo "Generating keystore..."
keytool -genkey -v \
    -keystore "$KEYSTORE_FILE" \
    -alias "$KEY_ALIAS" \
    -keyalg RSA \
    -keysize 2048 \
    -validity "$VALIDITY_DAYS" \
    -storepass "$KEYSTORE_PASSWORD" \
    -keypass "$KEY_PASSWORD" \
    -dname "CN=JW News, OU=Ashbi, O=Ashbi, L=Toronto, ST=ON, C=CA"

echo ""
echo "✅ Keystore created: $KEYSTORE_FILE"
echo ""
echo "=================================="
echo "SAVE CREDENTIALS OUTSIDE THIS TERMINAL"
echo "=================================="
echo "Keystore file: $KEYSTORE_FILE"
echo "Key alias:     $KEY_ALIAS"
echo "(Passwords were set via env/prompt — they are NOT printed."
echo " Store them in a password manager. See docs/keystore-rotation-2026-07.md.)"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Move $KEYSTORE_FILE to a path outside the repo (never commit it)"
echo "2. Export KEYSTORE_PASSWORD / KEY_PASSWORD for release builds"
echo "3. Build signed release: cd android && ./gradlew assembleRelease"
