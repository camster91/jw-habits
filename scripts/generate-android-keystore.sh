#!/bin/bash
# Android Release Keystore Generator for JW News
# Run this script to create a proper release keystore

KEYSTORE_FILE="jwnews-release.keystore"
KEY_ALIAS="jwnews"
KEYSTORE_PASSWORD="jwnews2024secure"
KEY_PASSWORD="jwnews2024secure"
VALIDITY_DAYS=10000

echo "=================================="
echo "JW News Android Keystore Generator"
echo "=================================="
echo ""
echo "This will create a release keystore for Google Play submission."
echo "IMPORTANT: Save these credentials securely - you cannot recover them!"
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
echo "SAVE THESE CREDENTIALS:"
echo "=================================="
echo "Keystore file: $KEYSTORE_FILE"
echo "Key alias:     $KEY_ALIAS"
echo "Keystore pass: $KEYSTORE_PASSWORD"
echo "Key password:  $KEY_PASSWORD"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Move $KEYSTORE_FILE to android/app/"
echo "2. Update android/app/build.gradle with these credentials"
echo "3. Build signed release: cd android && ./gradlew assembleRelease"
