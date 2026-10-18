#!/bin/sh
# Process-only Cocoa argument-domain preference; no defaults database writes.
exec "${UI_RADIO_WEBKIT_EXECUTABLE:?Set the installed Playwright WebKit executable}" "$@" -AppleKeyboardUIMode 2
